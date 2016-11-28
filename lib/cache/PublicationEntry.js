import ObservableCollection from './ObservableCollection';
import RedisSubscriber from '../redis/RedisSubscriber';
import debug from '../debug';
import { getStrategy } from '../processors';
import { _ } from 'meteor/underscore';

export default class PublicationEntry {
    constructor(id, cursors, channels) {
        this.id = id;
        this.cursors = cursors;
        this.channels = channels;

        this.observers = [];
        this.redisSubscribers = [];

        /**
         * @var Array<ObservableCollection>
         */
        this.observableCollections = cursors.map(cursor => {
            return new ObservableCollection(this, cursor);
        });

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
                new RedisSubscriber(observableCollection, strategy, observableCollection.channels)
            );
        });
    }

    /**
     * Handler for stopping the subscription
     */
    stop() {
        this.redisSubscribers.forEach(subscriber => {
            subscriber.stop();
        });

        this.observableCollections.forEach(observableCollection => {
            observableCollection.clearStore();
        });
    }

    /**
     * @param observer
     */
    addObserver(observer) {
        if (!_.find(this.observers, (o) => o === observer)) {
            this.observers.push(observer);
            this._performInitialAddForObserver(observer);
        }
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

    /**
     * The first batch of documents that need to be added.
     * @param observer
     */
    _performInitialAddForObserver(observer) {
        debug('[PublicationEntry] Performing initial add for observer');

        this.observableCollections.forEach(observableCollection => {
            observableCollection.init();

            _.each(observableCollection.store, (doc, _id) => {
                if (!doc) return
                observer.added.call(observer, observableCollection.collectionName, _id, doc);
            });
        });
    }
}