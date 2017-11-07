import { getRedisListener } from './getRedisClient';
import debug from '../debug';
import { RedisPipe, Events } from '../constants';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import getFieldsOfInterestFromAll from './lib/getFieldsOfInterestFromAll';
import Config from '../config';

class RedisSubscriptionManager {
    init() {
        if (this.isInitialized) {
            return;
        }
        this.queue = new Meteor._SynchronousQueue();
        this.store = {}; // {channel: [RedisSubscribers]}
        this.channelHandlers = {}; // {channel: handler}

        this.isInitialized = true;
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
            })
        })
    }

    /**
     * @param redisSubscriber
     */
    detach(redisSubscriber) {
        this.queue.queueTask(() => {
            _.each(redisSubscriber.channels, channel => {
                if (!this.store[channel]) {
                    return debug('[RedisSubscriptionManager] Trying to detach a subscriber on a non existent channels.')
                } else {
                    this.store[channel] = _.without(this.store[channel], redisSubscriber);

                    if (this.store[channel].length === 0) {
                        this.destroyChannel(channel);
                    }
                }
            });
        })
    }

    /**
     * @param channel
     */
    initializeChannel(channel) {
        debug(`[RedisSubscriptionManager] Subscribing to channel: ${channel}`);

        // create the handler for this channel
        const self = this;
        const handler = function (message) {
            self.process(channel, message);
        };

        this.channelHandlers[channel] = handler;
        this.store[channel] = [];

        const {pubSubManager} = Config;
        pubSubManager.subscribe(channel, handler);
    }

    /**
     * @param channel
     */
    destroyChannel(channel) {
        debug(`[RedisSubscriptionManager] Unsubscribing from channel: ${channel}`);

        const {pubSubManager} = Config;
        pubSubManager.unsubscribe(channel, this.channelHandlers[channel]);

        delete this.store[channel];
        delete this.channelHandlers[channel];
    }

    /**
     * @param channel
     * @param data
     * @param inSync
     */
    process(channel, data, inSync = false) {
        const subscribers = this.store[channel];
        if (!subscribers) {
            return;
        }

        let isSynthetic = data[RedisPipe.SYNTHETIC];

        debug(`[RedisSubscriptionManager] Received ${isSynthetic ? 'synthetic ' : ''}event: "${data[RedisPipe.EVENT]}" to "${channel}"`);

        if (subscribers.length === 0) {
            return;
        }

        if (!isSynthetic) {
            // we do the check for subscribers not being empty above, so we can safely use [0]
            // you shouldn't be on the same channel if you have different collections, that's a fact
            let doc = data[RedisPipe.DOC];

            if (data[RedisPipe.EVENT] !== Events.REMOVE) {
                const collection = subscribers[0].observableCollection.collection;
                const fieldsOfInterest = getFieldsOfInterestFromAll(subscribers);
                if (fieldsOfInterest === true) {
                    doc = collection.findOne(doc._id);
                } else {
                    doc = collection.findOne(doc._id, {fields: fieldsOfInterest})
                }
            }

            subscribers.forEach(redisSubscriber => {
                // WORK ON THIS
                const fn = inSync ? 'processSync' : 'process';
                redisSubscriber[fn](
                    data[RedisPipe.EVENT],
                    doc,
                    data[RedisPipe.FIELDS]
                )
            });
        } else {
            subscribers.forEach(redisSubscriber => {
                redisSubscriber.processSynthetic(
                    data[RedisPipe.EVENT],
                    data[RedisPipe.DOC],
                    data[RedisPipe.MODIFIER],
                    data[RedisPipe.MODIFIED_TOP_LEVEL_FIELDS]
                )
            });
        }
    }
}

export default new RedisSubscriptionManager();
