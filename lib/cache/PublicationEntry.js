import getRedisClient from '../redis/getRedisClient';
import ObservableCollection from './ObservableCollection';
import RedisSubscriber from '../redis/RedisSubscriber';
import { getStrategy } from '../processors';

export default class PublicationEntry {
    constructor(id, cursors, channels) {
        this.id = id;
        this.cursors = cursors;
        this.channels = channels;

        this.observers = [];
        this.redisSubscribers = [];

        this.observableCollections = cursors.map(cursor => {
            return new ObservableCollection(this, cursor);
        });

        this.client = getRedisClient(true);
        this.init();
    }

    /**
     * Initializes subscriptions and the client image on the server
     */
    init() {
        this.observableCollections.forEach(observableCollection => {
            const strategy = getStrategy(
                observableCollection.selector,
                observableCollection.options
            );

            this.redisSubscribers.push(
                new RedisSubscriber(this.client, observableCollection, strategy, this.channels)
            );
        });
    }

    /**
     * The first batch of documents that need to be added.
     * @param observer
     */
    performInitialAddForObserver(observer) {
        this.observableCollections.forEach(observableCollection => {
            observableCollection.init();

            _.each(observableCollection.store, (doc, _id) => {
                observer.added.call(observer, observableCollection.collectionName, _id, doc);
            });
        });
    }

    /**
     * Handler for stopping the subscription
     */
    stop() {
        this.redisSubscribers.forEach(subscriber => {
            subscriber.stop();
        });

        this.client.disconnect();
    }

    /**
     * @param observer
     */
    addObserver(observer) {
        this.observers.push(observer);
        this.performInitialAddForObserver(observer);
    }

    /**
     * @param observer
     */
    removeObserver(observer) {
        this.observers = _.without(this.observers, observer);
    }

    /**
     * @returns {boolean}
     */
    isObserversEmpty() {
        return this.observers.length === 0;
    }

    /**
     * @param action
     * @param args
     */
    send(action, ...args) {
        this.observers.forEach(observer => {
            observer[action].call(observer, ...args);
        })
    }
}