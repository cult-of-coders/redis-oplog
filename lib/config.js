/**
 * In-Memory configuration storage
 */
export default {
    isInitialized: false,
    debug: false,
    overridePublishFunction: true,
    redis: {
        port: 6379,          // Redis port
        host: '127.0.0.1',   // Redis host
    }
}