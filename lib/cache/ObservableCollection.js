import {_} from 'meteor/underscore';
import sift from 'sift';
import { Events, Strategy } from '../constants';

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

        this.storeStrategy();
    }

    /**
     *
     * @returns {*}
     */
    storeStrategy() {
        if (this.options.limit && this.options.sort) {
            return this.strategy = Strategy.LIMIT_SORT;
        }

        if (this.selector && this.selector._id && _.keys(this.selector).length === 1) {
            return this.strategy = Strategy.DEDICATED_CHANNELS;
        }

        this.strategy = Strategy.DEFAULT;
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
     * Sends the data through DDP
     *
     * @param event
     * @param args
     */
    send(event, ...args) {
        this.observer[event](this.collectionName, ...args);
    }

    /**
     * @param event Events
     * @param doc
     */
    process(event, doc) {
        if (!this.isEligible(doc)) {
            return;
        }

        // DEFAULT STRATEGY

        // CHECK IF WHAT WAS CHANGED IS RELEVANT (?)
        if (event === Events.INSERT) {
            return this.send('added', doc._id, doc);
        } else if (event === Events.UPDATE) {
            return this.send('changed', doc._id, doc);
        } else if (event === Events.REMOVE) {
            return this.send('removed', doc._id);
        }
    }


}