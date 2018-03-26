import './lib/mongo//mongoCollectionNames';

import publishWithRedis from './lib/publishWithRedis';
import { RedisPipe, Events } from './lib/constants';
import { Meteor } from 'meteor/meteor';
import stats from './lib/utils/stats';
import init from './lib/init';
import Config from './lib/config';
import { getRedisListener, getRedisPusher } from './lib/redis/getRedisClient';
import SyntheticMutator from './lib/mongo/SyntheticMutator';
import ObservableCollection from './lib/cache/ObservableCollection';
import Vent from './lib/vent/Vent';
import PublicationFactory from './lib/cache/PublicationFactory';

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
    ObservableCollection,
    RedisPipe,
    Config,
    Events,
    Vent,
    publishWithRedis,
    getRedisListener,
    getRedisPusher,
    PublicationFactory,
}

if (Meteor.settings.redisOplog) {
    init(Meteor.settings.redisOplog);
} else {
    console.log("RedisOplog could not find Meteor.settings.redisOplog. Did you add the redisOplog settings at Meteor.settings.redisOplog?");
}
