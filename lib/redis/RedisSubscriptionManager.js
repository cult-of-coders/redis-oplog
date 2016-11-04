import getRedisClient from './getRedisClient';
import debug from '../debug';
import { RedisPipe } from '../constants';

class RedisSubscriptionManager {
    constructor() {
        this.client = getRedisClient(true);
        this.queue = new Meteor._SynchronousQueue();
        this.store = {}; // {channel: [RedisSubscribers]}

        this.listen();
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
                    return debug('Trying to detach a subscriber on a non existent channels.')
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
    }

    /**
     * @param channel
     */
    destroyChannel(channel) {
        debug(`[RedisSubscriptionManager] Unsubscribing from channel: ${channel}`);

        this.client.unsubscribe(channel);
        delete this.store[channel];
    }

    /**
     * Global message listener.
     */
    listen() {
        this.client.on('message', (channel, message) => {
            if (!this.store[channel]) {
                debug('We received a message, without having any registered RedisSubscribers to it. Something went wrong.')

                return;
            }

            const data = EJSON.parse(message);

            debug(`[RedisSubscriptionManager] Sending data to ${channel} ...`);

            _.each(this.store[channel], redisSubscriber => {

                redisSubscriber.process(
                    data[RedisPipe.EVENT],
                    data[RedisPipe.DOC],
                    data[RedisPipe.FIELDS],
                )
            });
        })
    }
}

export default new RedisSubscriptionManager();