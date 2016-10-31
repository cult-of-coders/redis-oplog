import getRedisClient from './getRedisClient';
import Constants from './constants';
import sift from 'sift';
import {_} from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';

export const STRATEGIES = {
    DEFAULT: 'D',
    DEDICATED_CHANNELS: 'DC',
    LIMIT_SORT: 'LS'
};

class Publication {
    constructor(cursor) {
        this.collectionName = cursor._cursorDescription.collectionName;

        this.selector = cursor._cursorDescription.selector || {};
        this.options = cursor._cursorDescription.options || {};

        if (this.selector) {
            this.siftTester = sift(this.selector);
        }

        this.strategy = this.getStrategy();

        this.client = getRedisClient(true);
    }

    isEligibleForQuery(doc) {
        if (!this.siftTester) {
            return true;
        }

        return this.siftTester(doc);
    }

    getStrategy() {
        if (this.options.limit && this.options.sort) {
            return STRATEGIES.LIMIT_SORT;
        }

        if (this.filters && this.filters._id && _.keys(this.filters).length === 1) {
            return STRATEGIES.DEDICATED_CHANNELS;
        }

        return STRATEGIES.DEFAULT;
    }

    init(context) {
        if (this.strategy === STRATEGIES.DEFAULT) {

        }

        _.each(cursor.fetch(), doc => {
            context.added(this.collectionName, doc._id, doc);
        });

        context.onStop(() => {
            this.client.disconnect();
        });

        context.ready();
    }
}