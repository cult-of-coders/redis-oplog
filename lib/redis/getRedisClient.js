import redis from 'redis';
import Config from '../config';
import { Meteor } from 'meteor/meteor';
import debug from "../debug";

// Redis requires two connections for pushing and listening to data
let redisPusher;
let redisListener;

function attachPingTimerEvents(client) {
    if(!Config.pingIntervalMs || Config.pingIntervalMs <= 0) return;
    let pingTimer = null;
    client.on('connect', function(err) {
        if(err) return;
        debug('RedisOplog - Ping timer connected');
        pingTimer = setInterval(() => {
            debug('RedisOplog - Pinging redis');
            client.ping();
        }, Config.pingIntervalMs);
    });

    client.on('end', function() {
        debug('RedisOplog - Ping timer ended');
        if(pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
        }
    });
}


/**
 * Returns the pusher for events in Redis
 *
 * @returns {*}
 */
export function getRedisPusher() {
    if (!redisPusher) {
        redisPusher = redis.createClient(Object.assign({}, Config.redis, {
            retry_strategy: getRetryStrategy()
        }));
        attachPingTimerEvents(redisPusher);
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
        redisListener = redis.createClient(Object.assign({}, Config.redis, {
            retry_strategy: getRetryStrategy()
        }));

        attachPingTimerEvents(redisListener);
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
