/**
 * In-Memory configuration storage
 */

const { REDIS_URI, REDIS_PORT, REDIS_HOST } = process.env

let REDIS_URI_WITHOUT_TRANSPORT = '';

if (REDIS_URI)
    if (REDIS_URI.indexOf('redis://') || REDIS_URI.indexOf('rediss://'))
        // does "redis://dev-redis:6379" -> "dev-redis:6379"
        REDIS_URI_WITHOUT_TRANSPORT = REDIS_URI.split('://')[1];
    else
        REDIS_URI_WITHOUT_TRANSPORT = REDIS_URI

const DEFAULT_REDIS_PORT = 26379;
const DEFAULT_REDIS_HOST = '127.0.0.1';


const PROCESSED_REDIS_PORT = REDIS_PORT
    ? REDIS_PORT
    : REDIS_URI
        ? REDIS_URI_WITHOUT_TRANSPORT.split(':')[1]
        : DEFAULT_REDIS_HOST

const PROCESSED_REDIS_HOST = REDIS_HOST
    ? REDIS_HOST
    : REDIS_URI
        ? REDIS_URI_WITHOUT_TRANSPORT.split(':')[0]
        : DEFAULT_REDIS_PORT;


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
        host: PROCESSED_REDIS_HOST,
        port: PROCESSED_REDIS_PORT,
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
