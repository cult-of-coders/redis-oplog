import redis from 'redis';
import Config from '../config';

let RedisSingletonInstance;

/**
 * Useful function to get your redis connection up
 *
 * @param factory {Boolean} If true, creates a new instance of redis.
 * @returns {*}
 */
export default function (factory = false) {
    if (factory) {
        return new redis.createClient(
            Config.redis
        );
    }

    if (!RedisSingletonInstance) {
        RedisSingletonInstance = redis.createClient(
            Config.redis
        );
    }

    return RedisSingletonInstance;
}