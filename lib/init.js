// https://github.com/luin/ioredis#connect-to-redis
import Config from './config';
import extendMongoCollection from './mongo/extendMongoCollection';
import RedisSubscriptionManager from './redis/RedisSubscriptionManager';
import publishWithRedis from './publishWithRedis';
import PubSubManager from './redis/PubSubManager';
import {getRedisListener} from './redis/getRedisClient';
import PublicationFactory from './cache/PublicationFactory';
import deepExtend from 'deep-extend';

let isInitialized = false;

export default (config = {}) => {
    if (isInitialized) {
        throw 'You cannot initialize RedisOplog twice.';
    }

    isInitialized = true;

    deepExtend(Config, config);

    _.extend(Config, {
        isInitialized: true,
        oldPublish: Meteor.publish,
    });

    extendMongoCollection();

    Meteor.publishWithRedis = publishWithRedis.bind(Meteor);

    if (Config.overridePublishFunction) {
        Meteor.publish = Meteor.publishWithRedis;
    }

    // this initializes the listener singleton with the proper onConnect functionality
    getRedisListener({
        onConnect() {
            // this will be executed initially, but since there won't be any observable collections, nothing will happen
            PublicationFactory.reloadAll();
        }
    });

    RedisSubscriptionManager.init();
    Config.pubSubManager = new PubSubManager();
}
