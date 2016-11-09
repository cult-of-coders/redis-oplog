import './lib/meteor.extension';
import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';

checkNpmVersions({
    'redis': '2.6.x',
    'sift': '3.2.x',
    'dot-object': '1.5.x',
}, 'cultofcoders:redis-oplog');

import init from './lib/init';

const RedisOplog = {
    init
};

export { RedisOplog }