import { DiffSequence } from 'meteor/diff-sequence';
import { _ } from 'meteor/underscore';
import { LocalCollection } from 'meteor/minimongo';
import fieldProjectionIsExclusion from './lib/fieldProjectionIsExclusion';
import getChannels from './lib/getChannels';
import extractFieldsFromFilters from './lib/extractFieldsFromFilters';
import { MongoIDMap } from './mongoIdMap';
import { EJSON } from 'meteor/ejson';
import { Mongo } from 'meteor/mongo';
import { DDP } from 'meteor/ddp';

const allowedOptions = [
    'limit',
    'skip',
    'sort',
    'fields',
    'projection',
    'channels',
    'channel',
    'namespace',
    'namespaces',
];

export default class ObservableCollection {
    /**
     * Instantiate the collection
     * @param {*} param
     */
    constructor({ multiplexer, matcher, sorter, cursorDescription }) {
        this.multiplexer = multiplexer;
        this.matcher = matcher;
        this.cursorDescription = cursorDescription;

        this.collectionName = this.cursorDescription.collectionName;
        this.collection = Mongo.Collection.__getCollectionByName(
            cursorDescription.collectionName,
        );

        if (!this.collection) {
            throw new Meteor.Error(
                `We could not find the collection instance by name: "${
                    this.collectionName
                }", the cursor description was: ${JSON.stringify(
                    cursorDescription,
                )}`,
            );
        }

        // Here we apply the logic of changing the cursor based on the collection-level configuration
        if (this.collection._redisOplog) {
            const { cursor } = this.collection._redisOplog;
            if (cursor) {
                const context = DDP._CurrentPublicationInvocation.get();
                cursor.call(
                    context,
                    cursorDescription.options,
                    cursorDescription.selector,
                );
            }
        }

        if (!this.collection) {
            throw new Meteor.Error(
                'We could not properly identify the collection by its name: ' +
                this.collectionName +
                '. Make sure you added redis-oplog package before any package that instantiates a collection.',
            );
        }

        this.cursor = this.collection.find(
            cursorDescription.selector,
            cursorDescription.options,
        );

        this.store = new MongoIDMap();
        this.selector = this.cursorDescription.selector || {};

        if (_.isString(this.selector)) {
            this.selector = { _id: this.selector };
        }

        if (this.cursorDescription.options) {
            this.options = _.pick(
                this.cursorDescription.options,
                ...allowedOptions,
            );
        } else {
            this.options = {};
        }

        const fields = this.options.projection || this.options.fields;

        // check for empty projector object and delete.
        if (fields && _.isEmpty(fields)) {
            delete this.options.projection;
            delete this.options.fields;
        }

        if (fields) {
            this.fieldsArray = Object.keys(fields);

            if (!_.isArray(this.fieldsArray)) {
                throw new Meteor.Error(
                    'We could not properly extract any fields. "projection" or "fields" must be an object. This was provided: ' +
                    JSON.stringify(fields),
                );
            }

            this.projectFieldsOnDoc = LocalCollection._compileProjection(
                fields,
            );
            this.isFieldsProjectionByExclusion = fieldProjectionIsExclusion(
                fields,
            );
        }

        this.channels = getChannels(this.collectionName, this.options);
        this.fieldsOfInterest = this._getFieldsOfInterest();
        this.__isInitialized = false;

        const projection = fields || {};
        this._projectionFn = LocalCollection._compileProjection(projection); // Projection function, result of combining important fields for selector and
        // existing fields projection

        this._sharedProjection = matcher.combineIntoProjection(projection);
        if (sorter) {
            this._sharedProjection = sorter.combineIntoProjection(
                this._sharedProjection,
            );
        }
        this._sharedProjectionFn = LocalCollection._compileProjection(
            this._sharedProjection,
        );
    }

    /**
     * Function that checks whether the doc matches our filters
     *
     * @param doc
     * @returns {*}
     */
    isEligible(doc) {
        if (this.matcher) {
            return this.matcher.documentMatches(doc).result;
        }

        return true;
    }

    /**
     * Performs the initial search then puts them into the store.
     */
    async init() {
        if (this.__isInitialized) {
            return; // silently do nothing.
        }

        this.__isInitialized = true;
        let data = await this.cursor.fetchAsync();

        for (const doc of data) {
            await this.add(doc, true);
        }

        // This has too much control over multiplexer.
        this.multiplexer.ready();
    }

    /**
     * @param docId
     * @returns {boolean}
     */
    contains(docId) {
        return this.store.has(docId);
    }

    /**
     * @param doc {Object}
     * @param safe {Boolean} If this is set to true, it assumes that the object is cleaned
     */
    async add(doc, safe = false) {
        doc = EJSON.clone(doc);

        if (!safe) {
            if (this.fieldsArray) {
                doc = this.projectFieldsOnDoc(doc);
            }
        }

        this.store.set(doc._id, doc);
        await this.multiplexer.added(doc._id, doc);
    }

    /**
     * We use this method when we receive updates for a document that is not yet in the observable collection store
     * @param docId
     */
    async addById(docId) {
        const { limit, skip, ...cleanedOptions } = this.options;
        const doc = await this.collection.findOneAsync({ _id: docId }, cleanedOptions);

        this.store.set(docId, doc);

        if (doc) {
            this.multiplexer.added(doc._id, doc);
        }
    }

    /**
     * Sends over the wire only the top fields of changes, because the DDP client doesn't do deep merge.
     *
     * @param {object} doc
     */
    async change(doc/*, modifiedFields*/) {
        const docId = doc._id;
        const oldDoc = this.store.get(docId);
        if (oldDoc == null) {
            return;
        }

        this.store.set(docId, this._sharedProjectionFn(doc));

        const projectedNew = this._projectionFn(doc);
        const projectedOld = this._projectionFn(oldDoc);

        const changed = DiffSequence.makeChangedFields(
            projectedNew,
            projectedOld,
        );

        if (!_.isEmpty(changed)) {
            await this.multiplexer.changed(docId, changed);
        }
    }

    /**
     * @param docId string
     * @param modifier object
     * @private
     */
    async changeSynthetic(docId, modifier /*, topLevelFields*/) {
        if (!this.store.has(docId)) {
            return;
        }

        let storedDoc = this.store.get(docId);
        let oldDoc = EJSON.clone(storedDoc);

        LocalCollection._modify(storedDoc, modifier);

        const changed = DiffSequence.makeChangedFields(storedDoc, oldDoc);

        await this.multiplexer.changed(docId, changed);
    }

    /**
     * @param docId
     */
    async remove(docId) {
        const doc = this.store.pop(docId);
        if (doc != null) {
            await this.multiplexer.removed(docId, doc);
        }
    }

    /**
     * Used at initialization
     *
     * Creates and stores the fields specified in fields & filters
     * If by any chance there are no fields specified, we return true
     *
     * @private
     * @return {true|object}
     */
    _getFieldsOfInterest() {
        const fields = this.options.projection || this.options.fields;

        if (!fields) {
            return true;
        }

        // if you have some fields excluded (high chances, you don't, but we query for all fields either way)
        // because it can get very tricky with future subscribers that may need some fields
        if (this.isFieldsProjectionByExclusion) {
            return true;
        }

        // if we have options, we surely have a fields array
        let fieldsArray = this.fieldsArray.slice();
        if (Object.keys(this.selector).length > 0) {
            fieldsArray = _.union(
                fieldsArray,
                extractFieldsFromFilters(this.selector),
            );
        }

        return fieldsArray;
    }
}
