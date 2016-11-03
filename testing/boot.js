import { Mongo } from 'meteor/mongo';

const RedisCollection = new Mongo.Collection('test_redis_collection');

export { RedisCollection };

if (Meteor.isServer) {
    Meteor.publishWithRedis('redis_collection', function (filters, options) {
        return RedisCollection.find(filters, options);
    });

    Meteor.methods({
        'create'(item) {
            RedisCollection.insert(item);
        },
        'update'(selectors, modifier) {
            RedisCollection.update(selectors, modifier);
        },
        'remove'(selectors) {
            RedisCollection.remove(selectors);
        }
    })
}