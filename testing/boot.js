import { Mongo } from 'meteor/mongo';
import enableReactivity from '../lib/collection.extension'
import createPublication from '../lib/publication';

const RedisCollection = new Mongo.Collection('test_redis_collection');

export { RedisCollection };

if (Meteor.isServer) {
    enableReactivity(RedisCollection);

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

    Meteor.publish('redis_collection', function (filters, options) {
        createPublication(RedisCollection.find(filters, options))(this);
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