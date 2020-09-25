// https://github.com/luin/ioredis#connect-to-redis
import Config from './config';
import extendMongoCollection from './mongo/extendMongoCollection';
import RedisSubscriptionManager from './redis/RedisSubscriptionManager';
import PubSubManager from './redis/PubSubManager';
import { getRedisListener } from './redis/getRedisClient';
import deepExtend from 'deep-extend';
import reload from './processors/actions/reload';

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

    if (Config.extendMongoCollection) {
        extendMongoCollection();
    }

    // this initializes the listener singleton with the proper onConnect functionality
    getRedisListener({
        onConnect() {
            // this will be executed initially, but since there won't be any observable collections, nothing will happen
            // PublicationFactory.reloadAll();
            RedisSubscriptionManager.getAllRedisSubscribers().forEach(
                redisSubscriber => {
                    reload(redisSubscriber.observableCollection);
                }
            );
        },
    });

    RedisSubscriptionManager.init();
    Config.pubSubManager = new PubSubManager();
};
