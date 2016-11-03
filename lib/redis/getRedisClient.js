import Redis from 'ioredis';
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
        return new Redis(
            Config.redis
        );
    }

    if (!RedisSingletonInstance) {
        RedisSingletonInstance = new Redis(
            Config.redis
        );
    }

    return RedisSingletonInstance;
}