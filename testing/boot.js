import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog';

if (Meteor.isServer) {
    RedisOplog.init({
        redis: {
            port: 6379,          // Redis port
            host: '127.0.0.1',   // Redis host
        },
        debug: false
    });
}

const RedisCollection = new Mongo.Collection('test_redis_collection');

export { RedisCollection };

if (Meteor.isServer) {
    const opts = {namespace: 'x'};

    RedisCollection.allow({
      insert: () => true,
      update: () => true,
      remove: () => true,
    })

    RedisCollection.deny({
      insert: () => false,
      update: () => false,
      remove: () => false,
    })

    Meteor.publishWithRedis('redis_collection', function (filters, options) {
        return RedisCollection.find(filters, _.extend({}, options, opts));
    });

    Meteor.methods({
        'create'(item) {
            if (_.isArray(item)) {
                return _.map(item, i => RedisCollection.insert(i, opts));
            }

            return RedisCollection.insert(item, opts);
        },
        'update'(selectors, modifier) {
            RedisCollection.update(selectors, modifier, opts);
        },
        'remove'(selectors) {
            RedisCollection.remove(selectors, opts);
        }
    })
}
