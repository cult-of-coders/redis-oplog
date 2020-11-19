import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import debug from '../debug';
import { RedisPipe, Events } from '../constants';
import getFieldsOfInterestFromAll from './lib/getFieldsOfInterestFromAll';
import Config from '../config';

class RedisSubscriptionManager {
    init() {
        if (this.isInitialized) {
            return;
        }
        this.uid = Random.id();
        this.queue = new Meteor._SynchronousQueue();
        this.store = {}; // {channel: [RedisSubscribers]}
        this.channelHandlers = {}; // {channel: handler}

        this.isInitialized = true;
    }

    /**
     * Returns all RedisSubscribers regardless of channel
     */
    getAllRedisSubscribers() {
        const redisSubscribers = [];
        for (channel in this.store) {
            this.store[channel].forEach(_redisSubscriber =>
                redisSubscribers.push(_redisSubscriber)
            );
        }

        return redisSubscribers;
    }

    /**
     * @param redisSubscriber
     */
    attach(redisSubscriber) {
        this.queue.queueTask(() => {
            _.each(redisSubscriber.channels, channel => {
                if (!this.store[channel]) {
                    this.initializeChannel(channel);
                }

                this.store[channel].push(redisSubscriber);
            });
        });
    }

    /**
     * @param redisSubscriber
     */
    detach(redisSubscriber) {
        this.queue.queueTask(() => {
            _.each(redisSubscriber.channels, channel => {
                if (!this.store[channel]) {
                    return debug(
                        '[RedisSubscriptionManager] Trying to detach a subscriber on a non existent channels.'
                    );
                } else {
                    this.store[channel] = _.without(
                        this.store[channel],
                        redisSubscriber
                    );

                    if (this.store[channel].length === 0) {
                        this.destroyChannel(channel);
                    }
                }
            });
        });
    }

    /**
     * @param channel
     */
    initializeChannel(channel) {
        debug(`[RedisSubscriptionManager] Subscribing to channel: ${channel}`);

        let redisEvents = [];
        // create the handler for this channel
        const self = this;

        // debounce redis events into 200 ms batches
        const flushRedisEventsForChannel = _.debounce(() => {
            const events = redisEvents.slice();
            redisEvents = [];
            self.queue.queueTask(() => {
                self.process(channel, events, true);
            });
        }, Config.debounceInterval, false)

        const handler = (message) => {
            redisEvents.push(message);
            flushRedisEventsForChannel();
        };

        this.channelHandlers[channel] = handler;
        this.store[channel] = [];

        const { pubSubManager } = Config;
        pubSubManager.subscribe(channel, handler);
    }

    /**
     * @param channel
     */
    destroyChannel(channel) {
        debug(
            `[RedisSubscriptionManager] Unsubscribing from channel: ${channel}`
        );

        const { pubSubManager } = Config;
        pubSubManager.unsubscribe(channel, this.channelHandlers[channel]);

        delete this.store[channel];
        delete this.channelHandlers[channel];
    }

    /**
     * @param channel
     * @param events
     * @param fromRedis
     */
    process(channel, events, fromRedis) {
        const subscribers = this.store[channel];
        if (!subscribers) {
            return;
        }

        // messages from redis that contain our uid were handled
        // optimistically, so we can drop them.
        let filteredEvents = events.filter(event => !event[RedisPipe.SYNTHETIC]);
        const syntheticEvents = events.filter(event => event[RedisPipe.SYNTHETIC]);
        if (fromRedis) {
            filteredEvents = filteredEvents.filter(event => event[RedisPipe.UID] !== this.uid);
        }

        // determine the collection from the first observable collection
        const collection = subscribers[0].observableCollection.collection;
        const documentMap = this.getDocumentMapForEvents(collection, subscribers, filteredEvents);

        if (filteredEvents.length) {
            subscribers.forEach(redisSubscriber => {
                try {
                    redisSubscriber.process(filteredEvents, documentMap);
                } catch (e) {
                    debug(
                        `[RedisSubscriptionManager] Exception while processing event: ${e.toString()}`
                    );
                }
            });
        }
        if (syntheticEvents.length) {
            // TODO: process synthetic events in bulk
            syntheticEvents.forEach(data => {
                subscribers.forEach(redisSubscriber => {
                    try {
                        redisSubscriber.processSynthetic(
                            data[RedisPipe.EVENT],
                            data[RedisPipe.DOC],
                            data[RedisPipe.MODIFIER],
                            data[RedisPipe.MODIFIED_TOP_LEVEL_FIELDS]
                        );
                    } catch (e) {
                        debug(
                            `[RedisSubscriptionManager] Exception while processing synthetic event: ${e.toString()}`
                        );
                    }
                });
            })
        }
    }

    getDocumentMapForEvents(collection, subscribers, events) {
        const documentMap = {};
        const options = {};
        const fieldsOfInterest = getFieldsOfInterestFromAll(subscribers);
        if (fieldsOfInterest !== true) {
            options.fields = fieldsOfInterest;
        }

        const docIdsToFetch = [];
        events.forEach(event => {
            const doc = event[RedisPipe.DOC];
            if (collection._redisOplog && !collection._redisOplog.protectAgainstRaceConditions) {
                // If there's no protection against race conditions
                // It means we have received the full doc in doc
                documentMap[doc._id] = doc;
            }
            // no need to fetch full documents for remove event
            else if (event[RedisPipe.EVENT] === Events.REMOVE) {
                documentMap[doc._id] = doc;
            } else {
                docIdsToFetch.push(doc._id);
            }
        });

        if (docIdsToFetch.length) {
            collection.find({ _id: { $in: docIdsToFetch } }, options).fetch().forEach(doc => {
                documentMap[doc._id] = doc;
            });
        }

        return documentMap;
    }
}

export default new RedisSubscriptionManager();
