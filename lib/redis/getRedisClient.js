import redis from 'redis';
import Config from '../config';

let RedisPusher;
let RedisListener;

const retry_strategy = function (options) {
    if (options.error) {
        // End reconnecting on a specific error and flush all commands with a individual error
        console.error('Connection to Redis Server refused. Retrying again in 30s');
        console.error(JSON.stringify(options.error));
        // return new Error('The server refused the connection');
    }

    return 1000 * 30;
    // reconnect after
    // return Math.min(options.attempt * 100, 30000);
};

export function getRedisPusher() {
    if (!RedisPusher) {
        RedisPusher = redis.createClient(
            _.extend(Config.redis, {retry_strategy})
        );
    }

    return RedisPusher;
}

export function getRedisListener() {
    if (!RedisListener) {
        RedisListener = redis.createClient(
            _.extend(Config.redis, {retry_strategy})
        );
    }

    return RedisListener;
}
