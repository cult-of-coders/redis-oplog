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
        const self = this;

        // debounce redis events so that they are processed in bulk
        const flushRedisEventsForChannel = _.debounce(() => {
            const events = redisEvents.slice();
            redisEvents = [];
            self.queue.queueTask(() => {
                self.process(channel, events, true);
            });
        }, Config.debounceInterval, false)
        // create the handler for this channel
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

        const filteredEvents = [];
        const syntheticEvents = [];
        events.forEach(event => {
            // Ignore any updates that have been processed optimistically
            if (fromRedis && event[RedisPipe.UID] === this.uid) return;

            const isSynthetic = !!event[RedisPipe.SYNTHETIC];
            if (isSynthetic) {
                syntheticEvents.push(event);
            } else {
                filteredEvents.push(event);
            }
        });

        // Determine the collection from the first observable collection
        const collection = subscribers[0].observableCollection.collection;
        const documentMap = this.getDocumentMapForEvents(collection, subscribers, filteredEvents);

        // Process filtered events in bulk
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
        
        // Individually process synthetic events
        // TODO: process synthetic events in bulk
        if (syntheticEvents.length) {
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

    /**
     * Build a documentMap for the docIds in the redis events
     * @param collection 
     * @param subscribers 
     * @param events 
     */
    getDocumentMapForEvents(collection, subscribers, events) {
        const documentMap = {};
        const options = {};

        // Calculate fields of interest across all subscribers and add the
        // appropriate field limiting if necessary
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
            // no need to fetch full documents for the remove event
            else if (event[RedisPipe.EVENT] === Events.REMOVE) {
                documentMap[doc._id] = doc;
            } else {
                docIdsToFetch.push(doc._id);
            }
        });

        // Execute a single bulk fetch for all docIds that need to be fetched and store them in
        // the document map
        if (docIdsToFetch.length) {
            collection.find({ _id: { $in: docIdsToFetch } }, options).fetch().forEach(doc => {
                documentMap[doc._id] = doc;
            });
        }

        return documentMap;
    }
}

export default new RedisSubscriptionManager();
