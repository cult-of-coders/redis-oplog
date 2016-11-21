import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {RedisPipe, Events} from '../constants';
import getFields from '../utils/getFields';
import SmartObject from '../utils/SmartObject';
import { _ } from 'meteor/underscore';
import getMutationOptions from './lib/getMutationOptions';
import publish from './lib/publish';
import getRedisClient from '../redis/getRedisClient';
import extendObserveChanges from './extendObserveChanges';

// This monkey-patches the Collection constructor
// This code is the same monkey-patching code
// that matb33:collection-hooks uses, which works pretty nicely
// taken from https://github.com/rclai/meteor-collection-extensions/blob/master/collection-extensions.js#L72-L97
function wrapCollection(fn) {
    if (!Mongo._CollectionPrototype) Mongo._CollectionPrototype = new Mongo.Collection(null);

    const constructor = Mongo.Collection;
    const proto = Mongo._CollectionPrototype;
    Mongo.Collection = function (...args) {
        const ret = constructor.apply(this, args);
        fn.apply(this, args);
        return ret;
    };

    Mongo.Collection.prototype = proto;
    Mongo.Collection.prototype.constructor = Mongo.Collection;

    for (var prop in constructor) {
      if (constructor.hasOwnProperty(prop)) {
        Mongo.Collection[prop] = constructor[prop];
      }
    }
};

export default () => {
    wrapCollection(function collectionConstructor() {
        const collection = this
        const collectionDriver = this._collection
        const Originals = {
            insert: collectionDriver.insert,
            update: collectionDriver.update,
            remove: collectionDriver.remove,
            find: collection.find,
        };

        collection.find = function find(...args) {
            var cursor = Originals.find.call(this, ...args);

            extendObserveChanges(cursor, ...args);

            return cursor;
        }

        /**
         * @param data
         * @param cb
         * @param _config
         * @returns {*}
         */
        collectionDriver.insert = function insert(data, cb, _config) {
            let {callback, config} = getMutationOptions.call(collection, cb, _config);

            const result = Originals.insert.call(this, data, callback);

            config.pushToRedis && Meteor.defer(() => {
                const doc = collection.findOne(result && result.insertedIds && result.insertedIds[0]);
                const client = getRedisClient();

                publish(client, collection._name, config.channels, {
                    [RedisPipe.EVENT]: Events.INSERT,
                    [RedisPipe.FIELDS]: _.keys((new SmartObject(doc)).getDotObject()),
                    [RedisPipe.DOC]: doc
                })
            });

            return result;
        }

        /**
         * @param selector
         * @param modifier
         * @param cb
         * @param _config
         * @returns {*}
         */
        collectionDriver.update = function update(selector, modifier, cb, _config) {
            let {callback, config} = getMutationOptions.call(collection, cb, _config);

            // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
            let docIds = this.find(selector, {
                fields: {_id: 1}
            }).fetch().map(doc => doc._id);

            const result = Originals.update.call(this, selector, modifier, config, callback);

            config.pushToRedis && Meteor.defer(() => {
                const fields = getFields(modifier);

                let fieldsOptions = {};
                _.each(fields, field => {
                    // do not allow operator projection fields
                    fieldsOptions[field] = 1
                });

                let docs = this.find({
                    _id: {
                        $in: docIds
                    }
                }, {
                    fields: fieldsOptions
                }).fetch();

                const client = getRedisClient();

                docs.forEach(doc => {
                    publish(client, collection._name, config.channels, {
                        [RedisPipe.EVENT]: Events.UPDATE,
                        [RedisPipe.FIELDS]: fields,
                        [RedisPipe.DOC]: doc
                    }, doc._id);
                })
            });

            return result;
        }

        /**
         * @param selector
         * @param cb
         * @param _config
         * @returns {*}
         */
        collectionDriver.remove = function remove(selector, cb, _config) {
            let {callback, config} = getMutationOptions.call(collection, cb, _config);

            // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
            let docIds = this.find(selector, {
                fields: {_id: 1}
            }).fetch().map(doc => doc._id);

            const result = Originals.remove.call(this, selector, callback);

            config.pushToRedis && Meteor.defer(() => {
                const client = getRedisClient();

                docIds.forEach((docId) => {
                    publish(client, collection._name, config.channels, {
                        [RedisPipe.EVENT]: Events.REMOVE,
                        [RedisPipe.DOC]: {_id: docId},
                    }, docId);
                })
            });

            return result;
        }
    });
}
