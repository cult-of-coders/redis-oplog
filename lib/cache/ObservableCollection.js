import { DiffSequence } from 'meteor/diff-sequence';
import { _ } from 'meteor/underscore';
import { LocalCollection, Minimongo } from 'meteor/minimongo';
import cloneDeep from 'lodash.clonedeep';
import fieldProjectionIsExclusion from './lib/fieldProjectionIsExclusion';
import getChannels from './lib/getChannels';
import extractFieldsFromFilters from './lib/extractFieldsFromFilters';
import { MongoIDMap } from './mongoIdMap';
import isRemovedNonExistent from '../utils/isRemovedNonExistent';
import getStrategy from '../processors/getStrategy';

const allowedOptions = [
    'limit',
    'skip',
    'sort',
    'fields',
    'channels',
    'channel',
    'namespace',
    'namespaces',
];

const { Matcher } = Minimongo;

export default class ObservableCollection {
    /**
     * @param observer
     * @param cursor
     * @param config
     */
    constructor(multiplexer, matcher, sorter, cursorDescription) {
        this.multiplexer = multiplexer;
        this.cursorDescription = cursorDescription;

        this.collectionName = this.cursorDescription.collectionName;
        this.collection = Mongo.Collection.__getCollectionByName(
            cursorDescription.collectionName
        );

        if (this.collection._redisOplog) {
            const { cursor } = this.collection._redisOplog;
            if (cursor) {
                const context = DDP._CurrentPublicationInvocation.get();
                cursor.call(
                    context,
                    cursorDescription.options,
                    cursorDescription.selector
                );
            }
        }

        if (!this.collection) {
            throw new Meteor.Error(
                'We could not properly identify the collection by its name: ' +
                    this.collectionName +
                    '. Make sure you added redis-oplog package before any package that instantiates a collection.'
            );
        }

        this.cursor = this.collection.find(
            cursorDescription.selector,
            cursorDescription.options
        );

        this.store = new MongoIDMap();
        this.selector = this.cursorDescription.selector || {};

        if (_.isString(this.selector)) {
            this.selector = { _id: this.selector };
        }

        if (this.cursorDescription.options) {
            this.options = _.pick(
                this.cursorDescription.options,
                ...allowedOptions
            );
        } else {
            this.options = {};
        }

        // check for empty projector object and delete.
        if (this.options.fields && _.isEmpty(this.options.fields)) {
            delete this.options.fields;
        }

        if (this.options.fields) {
            this.fieldsArray = _.keys(this.options.fields);

            if (!_.isArray(this.fieldsArray)) {
                throw new Meteor.Error(
                    'We could not properly extract any fields. "fields" must be an object. This was provided: ' +
                        JSON.stringify(this.options.fields)
                );
            }

            this.projectFieldsOnDoc = LocalCollection._compileProjection(
                this.options.fields
            );
            this.isFieldsProjectionByExclusion = fieldProjectionIsExclusion(
                this.options.fields
            );
        }

        this.channels = getChannels(this.collectionName, this.options);
        this.testDocEligibility = this._createTestDocEligibility();
        this.fieldsOfInterest = this._getFieldsOfInterest();
        this.__isInitialized = false;

        var projection = this.options.fields || {};
        this._projectionFn = LocalCollection._compileProjection(projection); // Projection function, result of combining important fields for selector and
        // existing fields projection

        this._sharedProjection = matcher.combineIntoProjection(projection);
        if (sorter) {
            this._sharedProjection = sorter.combineIntoProjection(
                this._sharedProjection
            );
        }
        this._sharedProjectionFn = LocalCollection._compileProjection(
            this._sharedProjection
        );
    }

    /**
     * Function that checks whether or not the doc matches our filters
     *
     * @param doc
     * @returns {*}
     */
    isEligible(doc) {
        if (this.testDocEligibility) {
            return this.testDocEligibility(doc);
        }

        return true;
    }

    /**
     * @param _id
     * @returns {boolean}
     */
    isEligibleByDB(_id) {
        if (this.testDocEligibility) {
            return !!this.collection.findOne(
                _.extend({}, this.selector, { _id }),
                { fields: { _id: 1 } }
            );
        }

        return true;
    }

    /**
     * Performs the initial search then puts them into the store.
     */
    init() {
        if (this.__isInitialized) {
            return; // silently do nothing.
        }

        this.__isInitialized = true;
        let data = this.cursor.fetch();

        data.forEach(doc => {
            this.add(doc, true);
        });

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
     * Sends the data to the multiplexer
     *
     * @param event
     * @param args
     */
    send(event, ...args) {
        this.multiplexer[event].call(null, ...args);
    }

    /**
     * @param doc {Object}
     * @param safe {Boolean} If this is set to true, it assumes that the object is cleaned
     */
    add(doc, safe = false) {
        doc = cloneDeep(doc);

        if (!safe) {
            if (this.fieldsArray) {
                doc = this.projectFieldsOnDoc(doc);
            }
        }

        this.store.set(doc._id, doc);
        this.send('added', doc._id, doc);
    }

    /**
     * We use this method when we receive updates for a document that is not yet in the observable collection store
     * @param docId
     */
    addById(docId) {
        const doc = this.collection.findOne({ _id: docId }, this.options);

        this.store.set(docId, doc);

        if (doc) {
            this.send('added', doc._id, doc);
        }
    }

    /**
     * Sends over the wire only the top fields of changes, because DDP client doesnt do deep merge.
     *
     * @param {object} doc
     * @param {array} modifiedFields
     */
    change(doc, modifiedFields) {
        const docId = doc._id;
        const oldDoc = this.store.get(docId);
        if (oldDoc == null) {
            return;
        }

        this.store.set(docId, this._sharedProjectionFn(doc));

        var projectedNew = this._projectionFn(doc);
        var projectedOld = this._projectionFn(oldDoc);

        var changed = DiffSequence.makeChangedFields(
            projectedNew,
            projectedOld
        );

        if (!_.isEmpty(changed)) {
            this.send('changed', docId, changed);
        }
    }

    /**
     * @param docId string
     * @param modifier object
     * @param topLevelFields array
     * @private
     */
    changeSynthetic(docId, modifier, topLevelFields) {
        if (!this.store.has(docId)) {
            return;
        }

        let storedDoc = this.store.get(docId);
        let oldDoc = cloneDeep(storedDoc);

        LocalCollection._modify(storedDoc, modifier);

        var changed = DiffSequence.makeChangedFields(storedDoc, oldDoc);

        this.send('changed', docId, changed);
    }

    /**
     * @param docId
     */
    remove(docId) {
        const doc = this.store.pop(docId);
        if (doc != null) {
            try {
                this.send('removed', docId, doc);
            } catch (e) {
                // Supressing `removed non-existent exceptions`
                if (!isRemovedNonExistent(e)) {
                    throw e;
                }
            }
        }
    }

    /**
     * Clears the store
     */
    clearStore() {
        this.store.clear();
    }

    /**
     * Returns whether the limit of allowed documents is reached
     * based on the selector options
     */
    isLimitReached() {
        if (this.options.limit) {
            const size = this.store.size();
            return size >= this.options.limit;
        }

        return false;
    }

    /**
     * Used at initialization
     *
     * Creates the function that checks if the document is valid
     *
     * @returns {null}
     * @private
     */
    _createTestDocEligibility() {
        const self = this;

        if (_.keys(this.selector).length) {
            try {
                const matcher = new Matcher(this.selector);

                return function(object) {
                    return matcher.documentMatches(object).result;
                };
            } catch (e) {
                // The logic here is that if our matcher is too complex for minimongo
                // We put our matching function to query db
                if (
                    e.toString().indexOf('Unrecognized logical operator') >= 0
                ) {
                    return function(object) {
                        return self.isEligibleByDB(object._id);
                    };
                } else {
                    throw e;
                }
            }
        }

        return null;
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
        if (!this.options.fields) {
            return true;
        }

        // if you have some fields excluded (high chances you don't, but we query for all fields either way)
        // because it can get very tricky with future subscribers that may need some fields
        if (this.isFieldsProjectionByExclusion) {
            return true;
        }

        // if we have options, we surely have fields array
        let fieldsArray = this.fieldsArray.slice();
        if (_.keys(this.selector).length > 0) {
            fieldsArray = _.union(
                fieldsArray,
                extractFieldsFromFilters(this.selector)
            );
        }

        return fieldsArray;
    }
}
