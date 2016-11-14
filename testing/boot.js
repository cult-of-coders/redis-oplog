import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog';

if (Meteor.isServer) {
    RedisOplog.init({
        redis: {
            port: 6379,          // Redis port
            host: '127.0.0.1',   // Redis host
        }
    });
}

const RedisCollection = new Mongo.Collection('test_redis_collection');

export { RedisCollection };

if (Meteor.isServer) {
    Meteor.publishWithRedis('redis_collection', function (filters, options) {
        return RedisCollection.find(filters, _.extend({}, options, {
            namespace: 'x'
        }));
    });

    Meteor.methods({
        'create'(item) {
            return RedisCollection.insert(item, {namespace: 'x'});
        },
        'update'(selectors, modifier) {
            RedisCollection.update(selectors, modifier, {namespace: 'x'});
        },
        'remove'(selectors) {
            RedisCollection.remove(selectors, {namespace: 'x'});
        }
    })
}

