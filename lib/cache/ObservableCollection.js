import {_} from 'meteor/underscore';
import sift from 'sift';
import SmartObject from '../utils/SmartObject';
import deepExtend from '../utils/deepExtend';

export default class ObservableCollection {
    /**
     * @param observer
     * @param cursor
     */
    constructor(observer, cursor) {
        this.observer = observer;
        this.cursor = cursor;
        this.collectionName = cursor._cursorDescription.collectionName;
        this.collection = Mongo.Collection.get(this.collectionName);
        this.store = {};

        this.selector = cursor._cursorDescription.selector || {};
        if (cursor._cursorDescription.options) {
            this.options = _.pick(cursor._cursorDescription.options, 'limit', 'skip', 'sort');
        } else {
            this.options = {}
        }

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
     * @param doc
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
     * TODO: send on the wire only the changes, not the full object
     *
     * @param docId
     * @param doc
     */
    change(docId, doc) {
        const cleanedDoc = this._getCleanedObject(doc);
        let storedDoc = this.store[docId];
        deepExtend(storedDoc, cleanedDoc);

        let changedData = {};
        _.each(cleanedDoc, (value, key) => {
            changedData[key] = storedDoc[key];
        });

        this.send('changed', docId, changedData);
    }

    /**
     * @param docId
     */
    remove(docId) {
        if (this.store[docId]) {
            delete this.store[docId];

            this.send('removed', docId);
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
}
