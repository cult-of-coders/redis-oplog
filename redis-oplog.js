import publishWithRedis from './lib/publishWithRedis';
import { RedisPipe, Events } from './lib/constants';
import { Meteor } from 'meteor/meteor';
import stats from './lib/utils/stats';
import init from './lib/init';
import Config from './lib/config';
import { getRedisListener, getRedisPusher } from './lib/redis/getRedisClient';
import SyntheticMutator from './lib/mongo/SyntheticMutator';

const RedisOplog = {
    init,
    stats
};

// Warnings
Meteor.startup(function () {
    if (Package['insecure']) {
        console.log("RedisOplog does not support the insecure package.")
    }
});

export {
    RedisOplog,
    SyntheticMutator,
    RedisPipe,
    Config,
    Events,
    publishWithRedis,
    getRedisListener,
    getRedisPusher,
}

if (Meteor.settings.redisOplog) {
    init(Meteor.settings.redisOplog);
}
