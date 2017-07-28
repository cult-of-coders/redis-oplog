// Why require installation ?
// import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';
// checkNpmVersions({
//     'redis': '2.6.x',
//     'dot-object': '1.5.x',
// }, 'cultofcoders:redis-oplog');

import publishWithRedis from './lib/publishWithRedis';
import { RedisPipe, Events } from './lib/constants';
import { Meteor } from 'meteor/meteor';
import stats from './lib/utils/stats';
import init from './lib/init';
import SyntheticMutator from './lib/mongo/SyntheticMutator';

const RedisOplog = {
    init,
    stats
};

export {
    RedisOplog,
    SyntheticMutator,
    publishWithRedis,
    RedisPipe,
    Events
}

if (Meteor.settings.redisOplog) {
    init(Meteor.settings.redisOplog);
}
