import {_} from 'meteor/underscore';
import sift from 'sift';
import SmartObject from './SmartObject';

class ObservableCollection {
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
            this.store[doc._id] = _.omit(doc, '_id');
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
        let cleanedDoc = (new SmartObject(doc, this.options.fields)).cleanAndRetrieve();
        this.store[doc._id] = cleanedDoc;

        this.send('added', doc._id, cleanedDoc);
    }

    /**
     * @param docId
     * @param doc
     */
    change(docId, doc) {
        this.store[docId] = (new SmartObject(doc, this.options.fields)).cleanAndRetrieve();

        this.send('changed', docId, doc);
    }

    /**
     * @param docId
     */
    remove(docId) {
        delete this.store[docId];

        this.send('removed', docId);
    }
}
