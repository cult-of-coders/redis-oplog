import './lib/meteor.extension';
import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';

checkNpmVersions({
    'ioredis': '2.4.x'
}, 'cultofcoders:redis-oplog');

import init from './lib/init';

const RedisOplog = {
    init
};

export { RedisOplog }