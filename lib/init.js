// https://github.com/luin/ioredis#connect-to-redis
import Config from './config';
import extendMongoCollection from './mongo/collection.extension';
import RedisSubscriptionManager from './redis/RedisSubscriptionManager';
import publishWithRedis from './publishWithRedis';

let isInitialized = false;

export default ({
    redis = {
        port: 6379,          // Redis port
        host: '127.0.0.1',   // Redis host
    },
    debug,
    overridePublishFunction
} = {}) => {
    if (isInitialized) {
        throw 'You cannot initialize RedisOplog twice.';
    }

    isInitialized = true;

    _.extend(Config, {
        redis,
        debug,
        overridePublishFunction,
        isInitialized: true
    });

    Meteor.defaultPublish = Meteor.publish;
    extendMongoCollection();

    Meteor.publishWithRedis = publishWithRedis.bind(Meteor);

    if (Config.overridePublishFunction) {
        Meteor.publish = Meteor.publishWithRedis;
    }

    RedisSubscriptionManager.init();
}
