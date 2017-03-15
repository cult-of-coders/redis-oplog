import { getRedisListener } from './getRedisClient';
import debug from '../debug';
import { RedisPipe } from '../constants';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

class RedisSubscriptionManager {
    init() {
        if (this.isInitialized) {
            return;
        }

        this.client = getRedisListener();
        this.queue = new Meteor._SynchronousQueue();
        this.store = {}; // {channel: [RedisSubscribers]}
        this.channelLastIds = {};

        this.listen();
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

        this.client.subscribe(channel);

        this.store[channel] = [];
        this.channelLastIds[channel] = null;
    }

    /**
     * @param channel
     */
    destroyChannel(channel) {
        debug(`[RedisSubscriptionManager] Unsubscribing from channel: ${channel}`);

        this.client.unsubscribe(channel);

        delete this.store[channel];
        delete this.channelLastIds[channel];
    }

    /**
     * Global message listener.
     */
    listen() {
        this.client.on('message', (channel, message) => {
            if (!this.store[channel]) {
                return;
            }

            const data = EJSON.parse(message);

            this.process(channel, data);
        })
    }

    /**
     * @param channel
     * @param data
     */
    process(channel, data) {
        if (!this.store[channel]) {
            return;
        }

        let isSynthetic = data[RedisPipe.SYNTHETIC];

        debug(`[RedisSubscriptionManager] Received ${isSynthetic ? 'synthetic' : ''} event: "${data[RedisPipe.EVENT]}" to "${channel}"`);

        // Avoid re-computing changes from an optimistic ui update
        // In redis-oplog optimistic-ui updates means computing the changes for the server that triggers them
        const uid = data[RedisPipe.UID];
        if (uid && this.channelLastIds[channel] === uid) {
            return;
        }

        _.each(this.store[channel], redisSubscriber => {
            if (!isSynthetic) {
                redisSubscriber.process(
                    data[RedisPipe.EVENT],
                    data[RedisPipe.DOC],
                    data[RedisPipe.FIELDS]
                )
            } else {
                redisSubscriber.processSynthetic(
                    data[RedisPipe.EVENT],
                    data[RedisPipe.DOC],
                    data[RedisPipe.MODIFIER],
                    data[RedisPipe.MODIFIED_TOP_LEVEL_FIELDS]
                )
            }
        });
    }
}

export default new RedisSubscriptionManager();
