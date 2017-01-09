import { Meteor } from 'meteor/meteor';
import getMutationConfig from './lib/getMutationConfig';
import publish from './lib/publish';
import getFields from '../utils/getFields';
import {RedisPipe, Events} from '../constants';
import getRedisClient from '../redis/getRedisClient';
import compensateForLatency from './lib/compensateForLatency';
import {dispatchInsert, dispatchUpdate, dispatchRemove} from './lib/dispatchers';

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

        dispatchInsert(this._name, config._channels, docId);

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

        // searching the elements that will get updated by id
        const findOptions = {fields: {_id: 1}, transform: null};
        if (!config.multi) {
            findOptions.limit = 1;
        }

        let docIds = this.find(selector, findOptions).fetch().map(doc => doc._id);

        if (_config && _config.upsert) {
            return Mutator._handleUpsert.call(this, Originals, selector, modifier, config, callback, docIds)
        }

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

        if (config.pushToRedis) {
            const {fields, topLevelFields} = getFields(modifier);
            dispatchUpdate(this._name, config._channels, docIds, fields);
        }

        return result;
    }

    /**
     * @param Originals
     * @param selector
     * @param modifier
     * @param config
     * @param callback
     * @param docIds
     */
    static _handleUpsert(Originals, selector, modifier, config, callback, docIds) {
        const {insertedId, numberAffected} = Originals.update.call(
            this, selector, modifier, _.extend({}, config, {_returnObject: true})
        );

        if (config.pushToRedis) {
            if (insertedId) {
                dispatchInsert(this._name, config._channels, insertedId);
            } else {
                // it means that we run an upsert thinking there will be no docs
                if (docIds.length === 0 || numberAffected !== docIds.length) {
                    console.warn('RedisOplog - Warning - A race condition occurred when running upsert.');
                }

                const {fields, topLevelFields} = getFields(modifier);
                dispatchUpdate(this._name, config._channels, docIds, fields);
                // but in fact new docs sneaked in
                // there is no way to fix this properly
            }
        }

        if (callback) {
            callback.call(this, null, {insertedId, numberAffected});
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
        const removeSelector = _.extend({}, selector);

        // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
        let docIds = this.find(selector, {
            fields: {_id: 1},
            transform: null
        }).fetch().map(doc => doc._id);

        if (!selector._id) {
            removeSelector._id = {$in: docIds};
        }

        const result = Originals.remove.call(this, removeSelector);

        if (_.isFunction(_config)) {
            _config.call(this, null);
        }

        if (config.pushToRedis) {
            dispatchRemove(this._name, config._channels, docIds);
        }
    }
}
