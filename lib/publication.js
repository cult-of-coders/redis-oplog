import getRedisClient from './getRedisClient';
import Constants from './constants';
import sift from 'sift';
import {_} from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import ObservableCollection from './cache/ObservableCollection';


class Publication {
    constructor(context, cursor) {
        this.observableCollection = new ObservableCollection(context, cursor);
        this.client = getRedisClient(true);
    }

    init(context) {
        this.observableCollection.init();

        const name = this.observableCollection.collectionName;

        this.client.subscribe(`${name}::*`);

        this.client.on('message', (channel, message) => {
            const data = EJSON.parse(message);

            this.observableCollection.process(
                data[Constants.EVENT], data[Constants.DATA]
            )
        });

        context.onStop(() => {
            this.client.disconnect();
        });

        context.ready();
    }
}