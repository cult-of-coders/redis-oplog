/**
 * In-Memory configuration storage
 */
export default {
    isInitialized: false,
    debug: true,
    overridePublishFunction: true,
    mutationDefaults: {
        pushToRedis: true,
        optimistic: false
    },
    passConfigDown: false,
    redis: {
        port: 6379,          // Redis port
        host: '127.0.0.1',   // Redis host
    },
    redisExtras: {
        retry_strategy: function (options) {
            if (options.error) {
                // End reconnecting on a specific error and flush all commands with a individual error
                console.error('Connection to Redis Server refused. Retrying again in 30s');
                console.error(JSON.stringify(options.error));
                // return new Error('The server refused the connection');
            }

            return 1000 * 30;
            // reconnect after
            // return Math.min(options.attempt * 100, 30000);
        },
    }
}