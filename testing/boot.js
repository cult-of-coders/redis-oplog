import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { RedisOplog, SyntheticMutator } from 'meteor/skadmin:redis-oplog';

// if (Meteor.isServer) {
//     RedisOplog.init({
//         redis: {
//             port: 26379, // Redis port
//             host: 'redis-sentinel', //'127.0.0.1', // Redis host
//         },
//         // overridePublishFunction: true
//         // debug: true
//     });
// }

const Standard = new Mongo.Collection('test_redis_collection');
const Channel = new Mongo.Collection('test_redis_collection_channel');
const Namespace = new Mongo.Collection('test_redis_collection_namespace');

const RaceConditionProne = new Mongo.Collection('test_redis_race_condition_prone');
if (Meteor.isServer) {
    RaceConditionProne.configureRedisOplog({
        protectAgainstRaceConditions: false
    });
}

const Collections = { Standard, Channel, Namespace, RaceConditionProne };
const opts = {
    Standard: {},
    RaceConditionProne: {},
    Channel: { channel: 'some_channel' },
    Namespace: { namespace: 'some_namespace' },
};
const config = {
    RaceConditionProne: {
        suffix: 'race-condition-prone',
        disableSyntheticTests: true,
    },
    Standard: { suffix: 'standard', channel: 'test_redis_collection' },
    Channel: { suffix: 'channeled', channel: 'some_channel' },
    Namespace: {
        suffix: 'namespaced',
        channel: 'some_namespace::test_redis_collection_namespace',
    },
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

        Meteor.publish(`publication.${config[key].suffix}`, function(
            filters,
            options
        ) {
            return Collection.find(filters, _.extend({}, options, opts[key]));
        });

        Meteor.methods({
            [`create.${config[key].suffix}`](item, options = {}) {
                if (_.isArray(item)) {
                    return _.map(item, i =>
                        Collection.insert(i, _.extend(options, opts[key]))
                    );
                }

                return Collection.insert(item, _.extend(options, opts[key]));
            },
            [`fetch.${config[key].suffix}`](selector = {}, options = {}) {
                return Collection.find(selector, options).fetch();
            },
            [`update.${config[key].suffix}`](selectors, modifier, options) {
                return Collection.update(
                    selectors,
                    modifier,
                    _.extend({}, opts[key], options)
                );
            },
            [`upsert.${config[key].suffix}`](selectors, modifier, options) {
                return Collection.upsert(
                    selectors,
                    modifier,
                    _.extend({}, opts[key], options)
                );
            },
            [`remove.${config[key].suffix}`](selectors, options = {}) {
                return Collection.remove(
                    selectors,
                    _.extend(options, opts[key])
                );
            },
            [`synthetic.${config[key].suffix}`](
                method,
                _id,
                mutation,
                channel
            ) {
                return SyntheticMutator[method].call(
                    null,
                    channel || config[key].channel,
                    _id,
                    mutation
                );
            },
        });
    });
}
