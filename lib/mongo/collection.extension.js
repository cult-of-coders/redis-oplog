import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {RedisPipe, Events} from '../constants';
import getFields from '../utils/getFields';
import SmartObject from '../utils/SmartObject';
import { _ } from 'meteor/underscore';
import getMutationConfig from './lib/getMutationConfig';
import publish from './lib/publish';
import getRedisClient from '../redis/getRedisClient';
import extendObserveChanges from './extendObserveChanges';
import compensateForLatency from './compensateForLatency';

export default () => {
    const Originals = {
        insert: Mongo.Collection.prototype.insert,
        update: Mongo.Collection.prototype.update,
        remove: Mongo.Collection.prototype.remove,
        find: Mongo.Collection.prototype.find,
    };

    _.extend(Mongo.Collection.prototype, {
        find(...args) {
            var cursor = Originals.find.call(this, ...args);

            extendObserveChanges(cursor, ...args);

            return cursor;
        },

        /**
         * @param data
         * @param config
         * @returns {*}
         */
        insert(data, config = {}) {
            config = getMutationConfig(this._name, config);

            const result = Originals.insert.call(this, data);

            const doc = this.findOne(result);

            // OPTIMISTIC UI CODE
            compensateForLatency(config._channels, Events.INSERT, doc);

            if (config.pushToRedis) {
                Meteor.defer(() => {
                    const client = getRedisClient();
                    publish(client, this._name, config._channels, {
                        [RedisPipe.EVENT]: Events.INSERT,
                        [RedisPipe.FIELDS]: _.keys((new SmartObject(doc)).getDotObject()),
                        [RedisPipe.DOC]: doc
                    })
                });
            }

            return result;
        },

        /**
         * @param selector
         * @param modifier
         * @param config
         * @returns {*}
         */
        update(selector, modifier, config) {
            config = getMutationConfig(this._name, config);

            // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
            let docIds = this.find(selector, {
                fields: {_id: 1}
            }).fetch().map(doc => doc._id);

            const result = Originals.update.call(this, selector, modifier, config);

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

            // OPTIMISTIC UI CODE
            docs.forEach(doc => {
                compensateForLatency(config._channels, Events.UPDATE, doc);
            });

            if (config.pushToRedis) {
                Meteor.defer(() => {
                    docs.forEach(doc => {
                        publish(client, this._name, config._channels, {
                            [RedisPipe.EVENT]: Events.UPDATE,
                            [RedisPipe.FIELDS]: fields,
                            [RedisPipe.DOC]: doc
                        }, doc._id);
                    })
                });
            }

            return result;
        },

        /**
         * @param selector
         * @param config
         * @returns {*}
         */
        remove(selector, config) {
            config = getMutationConfig(this._name, config);

            // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
            let docIds = this.find(selector, {
                fields: {_id: 1}
            }).fetch().map(doc => doc._id);

            const result = Originals.remove.call(this, selector);

            // OPTIMISTIC UI CODE
            docIds.forEach((docId) => {
                compensateForLatency(config._channels, Events.REMOVE, {_id: docId})
            });

            if (config.pushToRedis) {
                Meteor.defer(() => {
                    const client = getRedisClient();

                    docIds.forEach((docId) => {
                        publish(client, this._name, config._channels, {
                            [RedisPipe.EVENT]: Events.REMOVE,
                            [RedisPipe.DOC]: {_id: docId},
                        }, docId);
                    })
                });
            }

            return result;
        }
    });
}
