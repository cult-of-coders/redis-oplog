import { Meteor } from 'meteor/meteor';
import Publication from './publication';
import { _ } from 'meteor/underscore';
import Config from './config';

_.extend(Meteor, {
    publishWithRedis(name, fn, {namespace} = {}) {
        if (!Config.isInitialized) {
            throw new Meteor.Error(`RedisOplog is not initialized`)
        }

        Meteor.publish(name, function (...args) {
            const cursor = fn.call(this, ...args);

            new Publication(this, cursor, namespace);
        })
    }
});
