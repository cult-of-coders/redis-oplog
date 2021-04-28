/**
 * In-Memory configuration storage
 */
const Config = {
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
        connectionName: null,
        retryStrategy: retryStrategy(),
    },
    globalRedisPrefix: '',
    retryIntervalMs: 10000,
    externalRedisPublisher: false,
    redisExtras: {
        events: {
            end(err) {
                console.error('RedisOplog - Connection to redis ended');
            },
            error(err) {
                console.error(
                    `RedisOplog - An error occured: \n`,
                    JSON.stringify(err),
                );
            },
            connect(err) {
                if (!err) {
                    console.log(
                        'RedisOplog - Established connection to redis.',
                    );
                } else {
                    console.error(
                        'RedisOplog - There was an error when connecting to redis',
                        JSON.stringify(err),
                    );
                }
            },
            reconnecting(err) {
                if (err) {
                    console.error(
                        'RedisOplog - There was an error when re-connecting to redis',
                        JSON.stringify(err),
                    );
                }
            },
        },
    }
};

function retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
}

export default Config;
