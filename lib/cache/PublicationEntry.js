import ObservableCollection from './ObservableCollection';
import RedisSubscriber from '../redis/RedisSubscriber';
import {Strategy} from '../constants';
import debug from '../debug';
import {getStrategy} from '../processors';
import {DDP} from 'meteor/ddp-client';
import {_} from 'meteor/underscore';

export default class PublicationEntry {
    constructor(id, cursor, factory) {
        this.id = id;
        this.factory = factory;
        this.cursor = cursor;
        this.observers = [];

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
        if (observer.added) {
            this._performInitialAddForObserver(observer);
        }

        this.observers.push(observer);
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
        // The idea here is that if you are doing an optimistic-ui mutation from a method
        // Before the method returns, it should write to the DDP's fence the changes
        // otherwise with an optimistic ui you will get a flicker (insert client side, response from method => removed, insert again from redis later)
        // So we will send added events in sync for the current observer, then defer the rest
        // We should not worry about duplicates because when we send a latency compensated event
        // We give it a random uuid, and if the listener of redis on this server gets a message with the last uuid, it will not process it
        // If it's different, and it can still happen, it will process it again, changes are very small.
        const invoke = DDP._CurrentInvocation.get();

        if (invoke && invoke.connection && invoke.connection.id) {
            // we send first to all watchers for invoke.connection.id
            const currentId = invoke.connection.id;

            const currentObservers = _.filter(this.observers, o => {
                return o.connection && o.connection.id == currentId;
            });

            if (currentObservers.length) {
                currentObservers.forEach(observer => {
                    observer[action].call(observer, ...args);
                });
            }

            // defer the rest so that the method yields quickly to the user, because we have applied it's changes.
            Meteor.defer(() => {
                this.observers.forEach(observer => {
                    if (!observer.connection || observer.connection.id != currentId) {
                        observer[action].call(observer, ...args);
                    }
                })
            });
        } else {
            this.observers.forEach(observer => {
                observer[action].call(observer, ...args);
            })
        }
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

        debug('[PublicationEntry] Completed initial add for observer');
    }
}