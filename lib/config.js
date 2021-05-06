/**
 * In-Memory configuration storage
 */

const { REDIS_URI } = process.env

let Config = {
    isInitialized: false,
    debug: false,
    overridePublishFunction: true,
    mutationDefaults: {
        pushToRedis: true,
        optimistic: true,
    },
    passConfigDown: false,
    redis: {
        port: REDIS_URI ? REDIS_URI.split(':')[1] : 6379,
        host: REDIS_URI ? REDIS_URI.split(':')[0] : '127.0.0.1',
    },
    globalRedisPrefix: '',
    retryIntervalMs: 10000,
    externalRedisPublisher: false,
    redisExtras: {
        retryStrategy: function(options) {
            return Config.retryIntervalMs;
            // reconnect after
            // return Math.min(options.attempt * 100, 30000);
        },
        events: {
            end(err) {
                console.error('RedisOplog - Connection to redis ended');
            },
            error(err) {
                console.error(
                    `RedisOplog - An error occured: \n`,
                    JSON.stringify(err)
                );
            },
            connect(err) {
                if (!err) {
                    console.log(
                        'RedisOplog - Established connection to redis.'
                    );
                } else {
                    console.error(
                        'RedisOplog - There was an error when connecting to redis',
                        JSON.stringify(err)
                    );
                }
            },
            reconnecting(err) {
                if (err) {
                    console.error(
                        'RedisOplog - There was an error when re-connecting to redis',
                        JSON.stringify(err)
                    );
                }
            },
        },
    },
};

export default Config;
