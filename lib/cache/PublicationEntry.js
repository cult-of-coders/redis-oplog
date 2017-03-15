import ObservableCollection from './ObservableCollection';
import RedisSubscriber from '../redis/RedisSubscriber';
import { Strategy } from '../constants';
import debug from '../debug';
import { getStrategy } from '../processors';
import { _ } from 'meteor/underscore';

export default class PublicationEntry {
    constructor(id, cursor, factory) {
        this.id = id;
        this.factory = factory;
        this.cursor = cursor;
        this.observers = [];
        this.redisSubscribers = [];

        /**
         * @var {ObservableCollection}
         */
        this.observableCollection = new ObservableCollection(this, cursor);

        this.init();
    }

    /**
     * Initializes subscriptions and the client image on the server
     */
    init() {
        const strategy = getStrategy(
            this.observableCollection.selector,
            this.observableCollection.options
        );

        // We do this because if we have dedicated channels, we may not need to interogate the db for eligibility
        if (strategy === Strategy.DEDICATED_CHANNELS) {
            let oc = this.observableCollection;
            if (oc.selector._id) {
                oc.__containsOtherSelectorsThanId = _.keys(oc.selector).length > 1;
            }
        }

        this.redisSubscriber = new RedisSubscriber(this, strategy);
    }

    /**
     * Handler for stopping the subscription
     */
    stop() {
        this.redisSubscriber.stop();
        this.observableCollection.clearStore();
    }

    /**
     * @param observer
     */
    addObserver(observer) {
        let observerExists = false;

        if (observer.connection) {
            observerExists = !!_.find(this.observers, o => {
                if (o.connection) {
                    return o.connection.id == observer.connection.id;
                }
            })
        }

        if (!observerExists) {
            this.observers.push(observer);
            this._performInitialAddForObserver(observer);
        }
    }

    /**
     * @param observer
     */
    removeObserver(observer) {
        this.observers = _.without(this.observers, observer);

        if (this.isObserversEmpty()) {
            debug(`[PublicationEntry] No other observers for: ${this.id}. Stopping subscription to redis.`);
            this.stop();
            this.factory.remove(this.id);
        }
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

        this.observableCollection.init();

        _.each(this.observableCollection.store, (doc, _id) => {
            // prevents error if document was removed while the _.each is running
            if (!doc) {
                return;
            }
            observer.added.call(observer, this.observableCollection.collectionName, _id, doc);
        });
    }
}