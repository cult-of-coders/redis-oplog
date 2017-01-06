import { Meteor } from 'meteor/meteor';
import getMutationConfig from './lib/getMutationConfig';
import publish from './lib/publish';
import getFields from '../utils/getFields';
import {RedisPipe, Events} from '../constants';
import getRedisClient from '../redis/getRedisClient';
import compensateForLatency from './compensateForLatency';

/**
 * The Mutator is the interface that does the required updates
 * and
 */
export default class Mutator {
    static init() {
        Mutator.passConfigDown = Package['aldeed:collection2'] !== undefined;
    }

    static insert(Originals, data, _config) {
        const config = getMutationConfig(this._name, _config);
        const docId = Originals.insert.call(this, data);

        if (_.isFunction(_config)) {
            _config.call(this, null, docId);
        }

        // OPTIMISTIC UI CODE
        compensateForLatency(config._channels, Events.INSERT, _.extend(data, {
            _id: docId
        }));

        if (config.pushToRedis) {
            Meteor.defer(() => {
                const client = getRedisClient();
                publish(client, this._name, config._channels, {
                    [RedisPipe.EVENT]: Events.INSERT,
                    [RedisPipe.DOC]: {_id: docId}
                });
            });
        }

        return docId;
    }

    /**
     * @param Originals
     * @param selector
     * @param modifier
     * @param _config
     * @param callback
     * @returns {*}
     */
    static update(Originals, selector, modifier, _config, callback) {
        const config = getMutationConfig(this._name, _config);

        if (_.isString(selector)) {
            selector = {_id: selector}
        }

        if (_config && _config.upsert) {
            return Mutator.upsert(Originals, selector, modifier, _config, callback);
        }

        // searching the elements that will get updated by id
        const findOptions = {fields: {_id: 1}, transform: null};
        if (!config.multi) {
            findOptions.limit = 1;
        }

        let docIds = this.find(selector, findOptions).fetch().map(doc => doc._id);

        // we do this because when we send to redis
        // we need the exact _ids
        // and we extend the selector, because if between finding the docIds and updating
        // another matching insert sneaked in, it's update will not be pushed
        const updateSelector = _.extend({}, selector, {
            _id: {$in: docIds}
        });

        const result = Originals.update.call(this, updateSelector, modifier, _config);

        // phony callback emulation
        if (callback) {
            callback.call(this, null, result);
        }

        // maybe we need to send out only the top-affected fields (?)
        const {fields, topLevelFields} = getFields(modifier);

        // OPTIMISTIC UI CODE
        docIds.forEach(docId => {
            compensateForLatency(config._channels, Events.UPDATE, {_id: docId}, fields);
        });

        if (config.pushToRedis) {
            const client = getRedisClient();

            Meteor.defer(() => {
                docIds.forEach(docId => {
                    publish(client, this._name, config._channels, {
                        [RedisPipe.EVENT]: Events.UPDATE,
                        [RedisPipe.FIELDS]: fields,
                        [RedisPipe.DOC]: {_id: docId}
                    }, docId);
                })
            });
        }

        return result;
    }

    /**
     * @param Originals
     * @param selector
     * @param modifier
     * @param _config
     * @param callback
     */
    static upsert(Originals, selector, modifier, _config, callback) {
        const config = getMutationConfig(this._name, _config);

        // searching the elements that will get updated by id
        const findOptions = {fields: {_id: 1}, transform: null};
        if (!config.multi) {
            findOptions.limit = 1;
        }

        let docIds = this.find(selector, findOptions).fetch().map(doc => doc._id);

        if (docIds.length > 0) {
            return Mutator.update(Originals, selector, modifier, _.omit(_config, 'upsert'), callback)
        }

        const {insertedId, numberAffected} = Originals.upsert.call(this, selector, modifier, _config);

        // phony callback emulation
        if (_.isFunction(callback)) {
            callback.call(this, null, insertedId, numberAffected);
        }

        if (config.pushToRedis) {
            if (insertedId) {
                Meteor.defer(() => {
                    const client = getRedisClient();
                    publish(client, this._name, config._channels, {
                        [RedisPipe.EVENT]: Events.INSERT,
                        [RedisPipe.DOC]: {_id: insertedId}
                    });
                });
            } else {
                console.warn('RedisOplog - Warning - A race condition occurred when running upsert.');
                // it means that we run an upsert thinking there will be no docs
                // but in fact new docs sneaked in
            }
        }

        return {insertedId, numberAffected};
    }

    /**
     * @param Originals
     * @param selector
     * @param _config
     * @returns {*}
     */
    static remove(Originals, selector, _config) {
        if (_.isString(selector)) {
            selector = {_id: selector};
        }

        const config = getMutationConfig(this._name, _config);

        // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
        let docIds = this.find(selector, {
            fields: {_id: 1},
            transform: null
        }).fetch().map(doc => doc._id);

        const result = Originals.remove.call(this, selector);

        if (_.isFunction(_config)) {
            _config.call(this, null);
        }

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
    }
}
