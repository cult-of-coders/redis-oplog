import redis from 'redis';
import Config from '../config';
import { _ } from 'meteor/underscore';

let RedisPusher;
let RedisListener;

export function getRedisPusher() {
    if (!RedisPusher) {
        RedisPusher = redis.createClient(_.extend({}, Config.redis, Config.redisExtras));
    }

    return RedisPusher;
}

export function getRedisListener() {
    if (!RedisListener) {
        RedisListener = redis.createClient(_.extend({}, Config.redis, Config.redisExtras));
    }

    return RedisListener;
}
