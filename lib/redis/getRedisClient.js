import Redis from 'ioredis';
import Config from '../config';
import { _ } from 'meteor/underscore';
import {Meteor} from 'meteor/meteor';

// Redis requires two connections for pushing and listening to data
let redisPusher;
let redisListener;

/**
 * Returns the pusher for events in Redis
 *
 * @returns {*}
 */
export function getRedisPusher() {
    if (!redisPusher) {
        redisPusher = new Redis(_.extend({}, Config.redis, {
            retry_strategy: getRetryStrategy()
        }));
    }

    return redisPusher;
}

/**
 * Returns the listener for events in Redis
 *
 * @param onConnect
 * @returns {*}
 */
export function getRedisListener({onConnect} = {}) {
    if (!redisListener) {
        redisListener = new Redis(_.extend({}, Config.redis, {
            retry_strategy: getRetryStrategy()
        }));

        // we only attach events here
        attachEvents(redisListener, {onConnect});
    }

    return redisListener;
}

/**
 *
 * @param client
 * @param onConnect
 */
function attachEvents(client, {onConnect}) {
    const functions = ['connect', 'reconnecting', 'error', 'end'];

    functions.forEach(fn => {
        redisListener.on(fn, Meteor.bindEnvironment(function (...args) {
            if (fn === 'connect' && onConnect) {
                onConnect();
            }
            if (Config.redisExtras.events[fn]) {
                return Config.redisExtras.events[fn](...args);
            }
        }))
    });
}

/**
 * Retrieves the retry strategy that can be modified
 * @returns {Function}
 */
function getRetryStrategy() {
    return function(...args) {
        if (Config.redisExtras.retry_strategy) {
            return Config.redisExtras.retry_strategy(...args);
        }
    }
}
