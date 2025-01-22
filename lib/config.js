import log from "./log";
import error from "./error";

/**
 * In-Memory configuration storage
 */
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
        port: 6379,
        host: '127.0.0.1',
    },
    globalRedisPrefix: '',
    retryIntervalMs: 10000,
    pingIntervalMs: 30000,
    externalRedisPublisher: false,
    redisExtras: {
        retry_strategy: function(options) {
            return Config.retryIntervalMs;
            // reconnect after
            // return Math.min(options.attempt * 100, 30000);
        },
        events: {
            end(err) {
                console.error('RedisOplog - Connection to redis ended');
            },
            error(err) {
                error(
                    `RedisOplog - An error occured: \n`,
                    JSON.stringify(err)
                );
            },
            connect(err) {
                if (!err) {
                    log(
                        'RedisOplog - Established connection to redis.'
                    );
                } else {
                    error(
                        'RedisOplog - There was an error when connecting to redis',
                        JSON.stringify(err)
                    );
                }
            },
            reconnecting(err) {
                if (err) {
                    error(
                        'RedisOplog - There was an error when re-connecting to redis',
                        JSON.stringify(err)
                    );
                }
            },
        },
    },
};

export default Config;
