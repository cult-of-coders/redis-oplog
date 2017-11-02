import {_} from 'meteor/underscore';
import deepExtend from 'deep-extend';
import cloneDeep from 'lodash.clonedeep';
import fieldProjectionIsExclusion from './lib/fieldProjectionIsExclusion';
import {filterAllowedFields, filterDisallowedFields} from './lib/filterFieldsForFetching';
import getChannels from './lib/getChannels';
import processUndefined from './lib/processUndefined';
import getTopLevelFields from './lib/getTopLevelFields';
import extractFieldsFromFilters from './lib/extractFieldsFromFilters';
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
        this.testDocEligibility = this._createTestDocEligibility();
        this.fieldsOfInterest = this._getFieldsOfInterest();
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
        doc = cloneDeep(doc);

        if (!safe) {
            if (this.fieldsArray) {
                doc = this.projectFieldsOnDoc(doc);
            }
        }

        this.store[doc._id] = doc;
        this.send('added', doc._id, doc);
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
     * @param {object} doc
     * @param {array} modifiedFields
     */
    change(doc, modifiedFields) {
        doc = cloneDeep(doc);

        if (!this.store[doc._id]) {
            return;
        }

        let storedDoc = this.store[doc._id];
        let oldDoc = cloneDeep(storedDoc);
        let topLevelFieldsArray;

        // if one of the modifiedFields is undefined in the result
        // then we should store it as a key
        // make sure this also works with arrays
        processUndefined(doc, modifiedFields);

        if (this.fieldsArray) {
            doc = this.projectFieldsOnDoc(doc);
        }

        topLevelFieldsArray = getTopLevelFields(modifiedFields);
        storedDoc = this._getExtendedStoreItem(doc._id, doc);

        // We do this because we need to push down the top-level fields
        // By this stage stored doc is already modified
        let changedTopLevelFields = {};
        topLevelFieldsArray.forEach(topLevelField => {
            changedTopLevelFields[topLevelField] = storedDoc[topLevelField];
        });

        // We need to clear it again, so we don't send "restrictedField": undefined.
        if (this.fieldsArray) {
            changedTopLevelFields = this.projectFieldsOnDoc(changedTopLevelFields);
        }

        this.send('changed', doc._id, changedTopLevelFields, storedDoc, oldDoc);
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
        let oldDoc = cloneDeep(storedDoc);

        LocalCollection._modify(storedDoc, modifier);
        let changedTopLevelFields = {};

        topLevelFields.forEach(topLevelField => {
            changedTopLevelFields[topLevelField] = storedDoc[topLevelField];
        });

        this.send('changed', docId, changedTopLevelFields, storedDoc, oldDoc);
    }

    /**
     * @param docId
     * @param objectForMerge
     * @returns {*}
     * @private
     */
    _getExtendedStoreItem(docId, objectForMerge) {
        let object = this.store[docId];
        deepExtend(object, objectForMerge);

        if (this.options.transform) {
            let newObject = this.options.transform(object);
            this.store[docId] = newObject;

            return newObject;
        }

        return object;
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

    /**
     * Used at initialization
     *
     * Creates the function that checks if the document is valid
     *
     * @returns {null}
     * @private
     */
    _createTestDocEligibility() {
        if (_.keys(this.selector).length) {
            const matcher =  new Matcher(this.selector);
            return function(object) {
                return matcher.documentMatches(object).result;
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
            fieldsArray = _.union(fieldsArray, extractFieldsFromFilters(this.selector))
        }

        return fieldsArray;
    }
}
