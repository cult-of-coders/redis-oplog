import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { RedisOplog, SyntheticMutator } from 'meteor/cultofcoders:redis-oplog';

if (Meteor.isServer) {
    RedisOplog.init({
        redis: {
            port: 6379,          // Redis port
            host: '127.0.0.1',   // Redis host
        },
        debug: true
    });
}

const Standard = new Mongo.Collection('test_redis_collection');
const Channel = new Mongo.Collection('test_redis_collection_channel');
const Namespace = new Mongo.Collection('test_redis_collection_namespace');
const RaceCondition = new Mongo.Collection('test_redis_collection_race_condition');

const Collections = {Standard, Channel, Namespace, RaceCondition};
const opts = {
    Standard: {},
    Channel: {channel: 'some_channel'},
    Namespace: {namespace: 'some_namespace'},
    RaceCondition: {protectFromRaceCondition: true}
};
const config = {
    Standard: {suffix: 'standard', channel: 'test_redis_collection'},
    Channel: {suffix: 'channeled', channel: 'some_channel'},
    Namespace: {suffix: 'namespaced', channel: 'some_namespace::test_redis_collection_namespace'},
    RaceCondition: {suffix: 'race_condition', channel: 'test_redis_collection_race_condition'}
};

export { Collections, opts, config };

if (Meteor.isServer) {
    _.each(Collections, (Collection, key) => {
        Collection.allow({
            insert: () => true,
            update: () => true,
            remove: () => true,
        });

        Collection.deny({
            insert: () => false,
            update: () => false,
            remove: () => false,
        });

        Meteor.publishWithRedis(`publication.${config[key].suffix}`, function (filters, options) {
            return Collection.find(filters, _.extend({}, options, opts[key]));
        });

        Meteor.methods({
            [`create.${config[key].suffix}`](item) {
                if (_.isArray(item)) {
                    return _.map(item, i => Collection.insert(i, opts[key]));
                }

                return Collection.insert(item, opts[key]);
            },
            [`update.${config[key].suffix}`](selectors, modifier, options) {
                return Collection.update(selectors, modifier, _.extend({}, opts[key], options));
            },
            [`remove.${config[key].suffix}`](selectors) {
                return Collection.remove(selectors, opts[key]);
            },
            [`synthetic.${config[key].suffix}`](method, ...args) {
                return SyntheticMutator[method].call(null, config[key].channel, ...args);
            }
        })
    });
}
