import { Mongo } from 'meteor/mongo';

const RedisCollection = new Mongo.Collection('test_redis_collection');

export { RedisCollection };

if (Meteor.isServer) {
    RedisCollection.remove({});

    RedisCollection.insert({
        title: 'A',
        score: 20,
        game: 'chess'
    });

    RedisCollection.insert({
        title: 'B',
        score: 30,
        game: 'chess'
    });

    RedisCollection.insert({
        title: 'C',
        score: 10,
        game: 'domino'
    });

    RedisCollection.insert({
        title: 'D',
        score: 40,
        game: 'chess'
    });

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