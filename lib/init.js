// https://github.com/luin/ioredis#connect-to-redis
import Config from './config';
import extendMongoCollection from './mongo/collection.extension';
import RedisSubscriptionManager from './redis/RedisSubscriptionManager';

export default ({
    redis = {
        port: 6379,          // Redis port
        host: '127.0.0.1',   // Redis host
    },
    debug,
    overridePublishFunction
} = {}) => {
    _.extend(Config, {
        redis,
        debug,
        overridePublishFunction,
        isInitialized: true
    });

    extendMongoCollection();

    if (Config.overridePublishFunction) {
        Meteor.publish = Meteor.publishWithRedis;
    }

    RedisSubscriptionManager.init();
}
