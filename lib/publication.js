import {_} from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import ObservableCollection from './cache/ObservableCollection';
import { getStrategy, getProcessor } from './processors';
import RedisSubscriber from './utils/RedisSubscriber';
import getRedisClient from './utils/getRedisClient';

export default class Publication {
    /**
     * @param client
     * @param observer
     * @param cursor
     * @param namespace
     */
    constructor(client, observer, cursor, namespace) {
        this.observableCollection = new ObservableCollection(observer, cursor);
        this.client = client;
        this.observer = observer;
        this.cursor = cursor;
        this.collectionName = this.observableCollection.collectionName;

        if (namespace) {
            this.namespaces = _.isArray(namespace) ? namespace : [namespace];
        } else {
            this.namespaces = [this.collectionName];
        }

        this.init();
    }

    /**
     * Initializez subscriptions and the client image on the server
     */
    init() {
        this.observableCollection.init();

        const strategy = getStrategy(
            this.observableCollection.selector,
            this.observableCollection.options
        );

        this.subscriber = new RedisSubscriber(this.client, this.observableCollection, strategy, this.namespaces);

        this.observer.ready();
    }

    /**
     * Handler for stopping the subscription
     */
    stop() {
        this.subscriber.stop();
    }
}