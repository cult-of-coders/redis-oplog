import Redis from 'ioredis';

let RedisSingletonInstance;

/**
 * Useful function to get your redis connection up
 *
 * @param factory {Boolean} If true, creates a new instance of redis.
 * @returns {*}
 */
export default function (factory = false) {
    if (factory) {
        return new Redis();
    }

    if (!RedisSingletonInstance) {
        RedisSingletonInstance = new Redis();
    }

    return RedisSingletonInstance;
}