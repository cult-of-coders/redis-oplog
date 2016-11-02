import { Meteor } from 'meteor/meteor';
import Publication from './publication';

_.extend(Meteor, {
    publishWithRedis(name, fn) {
        Meteor.publish(name, function (...args) {
            const cursor = fn.call(this, ...args);

            new Publication(this, cursor);
        })
    }
});