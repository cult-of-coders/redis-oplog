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
            insert: collectionDriver.insert.bind(collectionDriver),
            update: collectionDriver.update.bind(collectionDriver),
            remove: collectionDriver.remove.bind(collectionDriver),
            find: collection.find.bind(collection),
        };

        collection.find = function find(...args) {
            var cursor = Originals.find(...args);

            extendObserveChanges(cursor, ...args);

            return cursor;
        }

        collection._redisOptions = [];
        collection.getRedisOptions = function getRedisOptions(config) {
            if (typeof config === 'function') {
                collection._redisOptions.push(config);
            } else if (typeof config === 'object') {
                collection._redisOptions.push((type, ...args) => config[type] && config[type](...args));
            }
        }

        /**
         * @param data
         * @param callback
         * @returns {*}
         */
        collectionDriver.insert = function insert(data, callback) {
            const config = getMutationOptions.call(collection, 'insert', data);

            const processResult = (result) => {
                config.pushToRedis && Meteor.defer(() => {
                    const doc = collection.findOne((result && result.insertedIds && result.insertedIds[0]) || result);
                    const client = getRedisClient();

                    publish(client, collection._name, config.channels, {
                        [RedisPipe.EVENT]: Events.INSERT,
                        [RedisPipe.FIELDS]: _.keys((new SmartObject(doc)).getDotObject()),
                        [RedisPipe.DOC]: doc
                    })
                });
            }
            const wrappedCallback = !callback ? undefined : (err, result) => {
                if (!err) processResult(result)
                return callback(err, result)
            }
            const result = Originals.insert(data, wrappedCallback);
            if (!wrappedCallback) processResult(result)
            return result;
        }

        /**
         * @param selector
         * @param modifier
         * @param options
         * @param callback
         * @returns {*}
         */
        collectionDriver.update = function update(selector, modifier, options, callback) {
            const config = getMutationOptions.call(collection, 'update', selector, modifier, options);

            // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
            let docIds = collection.find(selector, {
                fields: {_id: 1}
            }).fetch().map(doc => doc._id);

            const processResult = (result) => {
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
            }

            const wrappedCallback = !callback ? undefined : (err, result) => {
                if (!err) processResult(result)
                return callback(err, result)
            }
            const result = Originals.update(selector, modifier, options, wrappedCallback);
            if (!wrappedCallback) processResult(result)
            return result;
        }

        /**
         * @param selector
         * @param callback
         * @returns {*}
         */
        collectionDriver.remove = function remove(selector, callback) {
            const config = getMutationOptions.call(collection, 'remove', selector);

            // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
            let docIds = this.find(selector, {
                fields: {_id: 1}
            }).fetch().map(doc => doc._id);

            const processResult = (result) => {
                config.pushToRedis && Meteor.defer(() => {
                    const client = getRedisClient();

                    docIds.forEach((docId) => {
                        publish(client, collection._name, config.channels, {
                            [RedisPipe.EVENT]: Events.REMOVE,
                            [RedisPipe.DOC]: {_id: docId},
                        }, docId);
                    })
                });
            }

            const wrappedCallback = !callback ? undefined : (err, result) => {
                if (!err) processResult(result)
                return callback(err, result)
            }
            const result = Originals.remove(selector, wrappedCallback);
            if (!wrappedCallback) processResult(result)
            return result;
        }
    });
}
