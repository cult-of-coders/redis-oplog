import {_} from 'meteor/underscore';
import sift from 'sift';
import SmartObject from '../utils/SmartObject';

export default class ObservableCollection {
    constructor(observer, cursor) {
        this.observer = observer;
        this.cursor = cursor;
        this.collectionName = cursor._cursorDescription.collectionName;
        this.collection = Mongo.Collection.get(this.collectionName);
        this.store = {};

        this.selector = cursor._cursorDescription.selector || {};
        this.options = cursor._cursorDescription.options || {};

        this.testDocEligibility = _.keys(this.selector).length ? sift(this.selector) : null;
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
     * Performs the initial search then adds all them to the store
     */
    init() {
        let data = this.cursor.fetch();

        data.forEach(doc => {
            this.store[doc._id] = doc;
        });

        this._addAllInStore();
    }

    /**
     * Loops through the store and adds all documents to the observer
     * @private
     */
    _addAllInStore() {
        _.each(this.store, (doc, _id) => {
            this.observer.added(this.collectionName, _id, doc);
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
        this.observer[event](this.collectionName, ...args);
    }

    /**
     * @param doc
     */
    add(doc) {
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
        this.store[docId] = cleanedDoc;

        this.send('changed', docId, cleanedDoc);
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
        let object = new SmartObject(doc, this.options.fields);

        return object.cleanAndRetrieve();
    }
}
