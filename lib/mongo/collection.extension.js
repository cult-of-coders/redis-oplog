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

const Originals = {
    insert: Mongo.Collection.prototype.insert,
    update: Mongo.Collection.prototype.update,
    remove: Mongo.Collection.prototype.remove,
    find: Mongo.Collection.prototype.find,
};

export default () => {
    _.extend(Mongo.Collection.prototype, {
        find(...args) {
            var cursor = Originals.find.call(this, ...args);

            extendObserveChanges(cursor, ...args);

            return cursor;
        },

        /**
         * @param data
         * @param cb
         * @param _config
         * @returns {*}
         */
        insert(data, cb, _config) {
            let {callback, config} = getMutationOptions.call(this, cb, _config);

            const result = Originals.insert.call(this, data, callback);

            config.pushToRedis && Meteor.defer(() => {
                const doc = this.findOne(result);
                const client = getRedisClient();

                publish(client, this._name, config.channels, {
                    [RedisPipe.EVENT]: Events.INSERT,
                    [RedisPipe.FIELDS]: _.keys((new SmartObject(doc)).getDotObject()),
                    [RedisPipe.DOC]: doc
                })
            });

            return result;
        },

        /**
         * @param selector
         * @param modifier
         * @param cb
         * @param _config
         * @returns {*}
         */
        update(selector, modifier, cb, _config) {
            let {callback, config} = getMutationOptions.call(this, cb, _config);

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
                    publish(client, this._name, config.channels, {
                        [RedisPipe.EVENT]: Events.UPDATE,
                        [RedisPipe.FIELDS]: fields,
                        [RedisPipe.DOC]: doc
                    }, doc._id);
                })
            });

            return result;
        },

        /**
         * @param selector
         * @param cb
         * @param _config
         * @returns {*}
         */
        remove(selector, cb, _config) {
            let {callback, config} = getMutationOptions.call(this, cb, _config);

            // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
            let docIds = this.find(selector, {
                fields: {_id: 1}
            }).fetch().map(doc => doc._id);

            const result = Originals.remove.call(this, selector, callback);

            config.pushToRedis && Meteor.defer(() => {
                const client = getRedisClient();

                docIds.forEach((docId) => {
                    publish(client, this._name, config.channels, {
                        [RedisPipe.EVENT]: Events.REMOVE,
                        [RedisPipe.DOC]: {_id: docId},
                    }, docId);
                })
            });

            return result;
        }
    });
}
