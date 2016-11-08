import './lib/meteor.extension';
import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';

checkNpmVersions({
    'redis': '2.6.x'
}, 'cultofcoders:redis-oplog');

import init from './lib/init';

const RedisOplog = {
    init
};

export { RedisOplog }