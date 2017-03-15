// https://github.com/luin/ioredis#connect-to-redis
import Config from './config';
import extendMongoCollection from './mongo/collection.extension';
import RedisSubscriptionManager from './redis/RedisSubscriptionManager';
import publishWithRedis from './publishWithRedis';

let isInitialized = false;

export default (config = {}) => {
    if (isInitialized) {
        throw 'You cannot initialize RedisOplog twice.';
    }

    isInitialized = true;

    _.extend(Config, config, {
        isInitialized: true
    });

    Meteor.defaultPublish = Meteor.publish;
    extendMongoCollection();

    Meteor.publishWithRedis = publishWithRedis.bind(Meteor);

    console.log(Config);

    if (Config.overridePublishFunction) {
        console.log('overriding publish function');

        Meteor.publish = Meteor.publishWithRedis;
    }

    RedisSubscriptionManager.init();
}
