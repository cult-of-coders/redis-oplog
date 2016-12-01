import {_} from 'meteor/underscore';
import sift from 'sift';
import cloneDeep from 'lodash.clonedeep';
import SmartObject from '../utils/SmartObject';
import deepExtend from 'deep-extend';
import getChannels from './lib/getChannels';
import mongoQuery from 'mongo-query';
import getFields from '../utils/getFields';

const allowedOptions = [
    'limit', 'skip', 'sort', 'fields', 'channels', 'channel', 'namespace', 'namespaces', 'protectFromRaceCondition'
];

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
            if (cursorDescription.options) {
                this.options = _.pick(cursorDescription.options, ...allowedOptions);
            } else {
                this.options = {}
            }
        } else {
            this.collectionName = cursor.collection.name;
            this.selector = {};
            this.options = {};
        }

        this.channels = getChannels(this.collectionName, this.options);
        this.testDocEligibility = _.keys(this.selector).length ? sift(this.selector) : null;

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

            return;
        }

        const cleanedDoc = this._getCleanedObject(doc);
        this.store[doc._id] = cleanedDoc;

        this.send('added', doc._id, cleanedDoc);
    }

    /**
     * We use this method when we receive updates for a document that is not yet in the observable collection store
     * @param docId
     */
    addById(docId) {
        const doc = this.collection.findOne({_id: docId}, this.options);
        if (doc) {
            this.send('added', doc._id, doc);
        }
    }

    /**
     * Sends over the wire only the top fields of changes, because DDP client doesnt do deep merge.
     *
     * @param docId
     * @param doc
     * @param modifier
     * @param isSynthetic
     */
    change(docId, doc, {isSynthetic, modifier} = {}) {
        if (!this.store[docId]) {
            return;
        }

        let storedDoc = this.store[docId];
        let oldDoc = cloneDeep(storedDoc);
        let cleanedDoc;

        if (isSynthetic) {
            if (modifier) {
                mongoQuery(storedDoc, {}, modifier);
            } else {
                cleanedDoc = this._getCleanedObject(doc);
                deepExtend(storedDoc, cleanedDoc);
            }
        } else {
            if (this.options.protectFromRaceCondition) {
                let opts = {};
                if (this.options.fields) {
                    opts.fields = this.options.fields;
                }

                cleanedDoc = this.collection.findOne(docId, opts);
                if (!cleanedDoc) {
                    this.remove(docId);

                    return;
                }
            } else {
                cleanedDoc = this._getCleanedObject(doc);
            }

            deepExtend(storedDoc, cleanedDoc);
        }

        this.send('changed', docId, storedDoc, oldDoc);
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
     * @param doc
     * @returns {*}
     * @private
     */
    _getCleanedObject(doc) {
        if (!this.options.fields) {
            return doc;
        }

        let object = new SmartObject(doc, this.options.fields);

        return object.cleanAndRetrieve();
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
