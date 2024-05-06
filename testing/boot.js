import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { RedisOplog, SyntheticMutator } from 'meteor/cultofcoders:redis-oplog';

if (Meteor.isServer) {
    RedisOplog.init({
        redis: {
            port: 6379, // Redis port
            host: '127.0.0.1', // Redis host
        },
        // overridePublishFunction: true
        // debug: true
    });
}

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
            insertAsync: () => true,
            updateAsync: () => true,
            removeAsync: () => true,
            insert: () => true,
            update: () => true,
            remove: () => true,
        });

        Collection.deny({
            insertAsync: () => false,
            updateAsync: () => false,
            removeAsync: () => false,
            insert: () => false,
            update: () => false,
            remove: () => false,
        });

        Meteor.publish(`publication.${config[key].suffix}`, async function(
            filters,
            options
        ) {
            return Collection.find(filters, Object.assign({}, options, opts[key]));
        });

        Meteor.methods({
            async [`create.${config[key].suffix}`](item, options = {}) {
                if (_.isArray(item)) {
                    const result = [];
                    for (const i of item) {
                        result.push(await Collection.insertAsync(i, Object.assign(options, opts[key])))
                    }

                    return result;
                }

                return Collection.insertAsync(item, Object.assign(options, opts[key]));
            },
            [`fetch.${config[key].suffix}`](selector = {}, options = {}) {
                return Collection.find(selector, options).fetchAsync();
            },
            [`update.${config[key].suffix}`](selectors, modifier, options) {
                return Collection.updateAsync(
                    selectors,
                    modifier,
                    Object.assign({}, opts[key], options)
                );
            },
            [`upsert.${config[key].suffix}`](selectors, modifier, options) {
                return Collection.upsertAsync(
                    selectors,
                    modifier,
                    Object.assign({}, opts[key], options)
                );
            },
            [`remove.${config[key].suffix}`](selectors, options = {}) {
                return Collection.removeAsync(
                    selectors,
                    Object.assign(options, opts[key])
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
