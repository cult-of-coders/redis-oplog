import {_} from 'meteor/underscore';
import deepExtend from 'deep-extend';
import fieldProjectionIsExclusion from './lib/fieldProjectionIsExclusion';
import {filterAllowedFields, filterDisallowedFields} from './lib/filterFieldsForFetching';
import getChannels from './lib/getChannels';
import getSnapbackFields from './lib/getSnapbackFields';
import processUndefined from './lib/processUndefined';
import { LocalCollection, Minimongo } from 'meteor/minimongo';

const allowedOptions = [
    'limit', 'skip', 'sort', 'fields', 'channels', 'channel', 'namespace', 'namespaces'
];

const {Matcher} = Minimongo;

export default class ObservableCollection {
    /**
     * @param observer
     * @param cursor
     * @param config
     */
    constructor(observer, cursor, config = {}) {
        this.observer = observer;
        this.cursor = cursor;
        this.config = config;
        this.store = {};

        const cursorDescription = cursor._cursorDescription;

        if (cursorDescription) {
            this.collectionName = cursorDescription.collectionName;
            this.collection = Mongo.Collection.get(this.collectionName);

            this.selector = cursorDescription.selector || {};

            if (_.isString(this.selector)) {
                this.selector = {_id: this.selector};
            }

            if (cursorDescription.options) {
                this.options = _.pick(cursorDescription.options, ...allowedOptions);
            } else {
                this.options = {}
            }
        } else {
            this.collectionName = cursor.collection.name;
            this.collection = Mongo.Collection.get(this.collectionName);
            this.selector = {};
            this.options = {};
        }

        if (!this.collection) {
            throw new Meteor.Error('We could not properly identify the collection by its name: ' + this.collectionName + '. Make sure you added redis-oplog package before any package that instantiates a collection.');
        }
        
        // check for empty projector object and delete.
        if (this.options.fields && _.isEmpty(this.options.fields)) {
            delete this.options.fields;   
        }
        
        if (this.options.fields) {
            this.fieldsArray = _.keys(this.options.fields);

            if (!_.isArray(this.fieldsArray)) {
                throw new Meteor.Error('We could not properly extract any fields. "fields" must be an object. This was provided: ' + JSON.stringify(this.options.fields));
            }

            this.projectFieldsOnDoc = LocalCollection._compileProjection(this.options.fields);
            this.isFieldsProjectionByExclusion = fieldProjectionIsExclusion(this.options.fields);
        }

        this.channels = getChannels(this.collectionName, this.options);
        this.testDocEligibility = null;
        if (_.keys(this.selector).length) {
            const matcher =  new Matcher(this.selector);
            this.testDocEligibility = function(object) {
                return matcher.documentMatches(object).result;
            }
        }

        this.__isInitialized = false;
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
                _.extend({}, this.selector, {_id}),
                {fields: {_id: 1}}
            )
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
            this.store[doc._id] = doc;
        });
    }

    /**
     * @param docId
     * @returns {boolean}
     */
    contains(docId) {
        return !!this.store[docId];
    }

    /**
     * Sends the data through DDP
     *
     * @param event
     * @param args
     */
    send(event, ...args) {
        this.observer.send(event, this.collectionName, ...args);
    }

    /**
     * @param doc {Object}
     * @param safe {Boolean} If this is set to true, it assumes that the object is cleaned
     */
    add(doc, safe = false) {
        if (safe) {
            this.store[doc._id] = doc;
            this.send('added', doc._id, doc);
        } else {
            this.addById(doc._id)
        }
    }

    /**
     * We use this method when we receive updates for a document that is not yet in the observable collection store
     * @param docId
     */
    addById(docId) {
        const doc = this.collection.findOne({_id: docId}, this.options);

        this.store[docId] = doc;

        if (doc) {
            this.send('added', doc._id, doc);
        }
    }

    /**
     * Sends over the wire only the top fields of changes, because DDP client doesnt do deep merge.
     *
     * @param docId
     * @param modifiedFields
     */
    change(docId, modifiedFields) {
        if (!this.store[docId]) {
            return;
        }

        let storedDoc = this.store[docId];
        let oldDoc = EJSON.clone(storedDoc);
        let topLevelFieldsArray;

        try {
            topLevelFieldsArray = this._changeNormal(storedDoc, modifiedFields);
        } catch (e) {
            if (e === 'not-found') {
                // Document was removed.
                this.remove(storedDoc._id);
                return;
            } else if (e === 'no-change') {
                // No changes is allowed to be pushed based on fields rules
                return;
            } else {
                throw e
            }
        }

        // We do this because we need to push down the top-level fields
        // By this stage stored doc is already modified
        let changedTopLevelFields = {};
        topLevelFieldsArray.forEach(topLevelField => {
            changedTopLevelFields[topLevelField] = storedDoc[topLevelField];
        });

        this.send('changed', docId, changedTopLevelFields, storedDoc, oldDoc);
    }

    /**
     * @param docId string
     * @param modifier object
     * @param topLevelFields array
     * @private
     */
    changeSynthetic(docId, modifier, topLevelFields) {
        if (!this.store[docId]) {
            return;
        }

        let storedDoc = this.store[docId];
        let oldDoc = EJSON.clone(storedDoc);

        LocalCollection._modify(storedDoc, modifier);
        let changedTopLevelFields = {};

        topLevelFields.forEach(topLevelField => {
            changedTopLevelFields[topLevelField] = storedDoc[topLevelField];
        });

        this.send('changed', docId, changedTopLevelFields, storedDoc, oldDoc);
    }

    /**
     * @param storedDoc The document that exists in the store as is
     * @param modifiedFields
     * @private
     */
    _changeNormal(storedDoc, modifiedFields) {
        let fields = {};

        if (this.fieldsArray) {
            if (this.isFieldsProjectionByExclusion) {
                fields = filterDisallowedFields(this.fieldsArray, modifiedFields)
            } else {
                fields = filterAllowedFields(this.fieldsArray, modifiedFields);
            }

            if (_.keys(fields).length == 1) {
                throw 'no-change';
            }
        } else {
            modifiedFields.forEach(field => fields[field] = 1);
        }

        let result = this.collection.findOne(storedDoc._id, {fields});

        if (!result) {
            throw 'not-found';
        }

        // if one of the modifiedFields is undefined in the result
        // then we should store it as a key
        // make sure this also works with arrays
        processUndefined(result, fields);

        if (this.fieldsArray) {
            this.projectFieldsOnDoc(result);
        }

        deepExtend(storedDoc, result);

        return _.keys(result);
    }

    /**
     * @param docId
     */
    remove(docId) {
        if (this.store[docId]) {
            let doc = this.store[docId];
            delete this.store[docId];

            this.send('removed', docId, doc);
        }
    }

    /**
     * Clears the store
     */
    clearStore() {
        _.each(this.store, (value, key) => {
            delete this.store[key];
        })
    }
}
