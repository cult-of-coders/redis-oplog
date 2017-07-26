import getMutationConfig from './lib/getMutationConfig';
import getFields from '../utils/getFields';
import {dispatchInsert, dispatchUpdate, dispatchRemove} from './lib/dispatchers';
import compensateForLatency from './lib/compensateForLatency';

import { DDP } from 'meteor/ddp-client';

/**
 * The Mutator is the interface that does the required updates
 * and
 */
export default class Mutator {
    static init() {
        const packages = Package['aldeed:collection2-core'] ||  Package['aldeed:collection2'];
        Mutator.passConfigDown = !_.isEmpty(packages);
    }

    static insert(Originals, data, _config) {
        const config = getMutationConfig(this._name, _config);

        if (!config.pushToRedis) {
            return Originals.insert.call(this, data);
        }

          // Get config: if passConfigDown, it will send the _config var.
        const passConfigDown = Mutator.passConfigDown && _config ? _config.selector : undefined;

        // If passing config down, the callback will be at the last position of the args, otherwise
        // it will be in _config (-2)
        const args = arguments;
        const callback = passConfigDown ? args[args.length - 1] : args[args.length - 2];

        try {
            const docId = Originals.insert.call(this, data, passConfigDown && _config);


            if (_.isFunction(callback)) {
                callback.call(this, null, docId);
            }

            dispatchInsert(config.optimistic, this._name, config._channels, docId);

            return docId;
        } catch (e) {
            if (_.isFunction(callback)) {
                return callback.call(this, e);
            } else {
                throw e;
            }
        }
    }

    /**
     * @param Originals
     * @param selector
     * @param modifier
     * @param _config
     * @param callback
     * @returns {*}
     */
    static update(Originals, selector, modifier, _config) {

        const config = getMutationConfig(this._name, _config);

        if (!config.pushToRedis) {
            return Originals.update.call(this, selector, modifier, _config);
        }

        if (_.isString(selector)) {
            selector = {_id: selector}
        }

        // Get config: if passConfigDown, it will send the _config var.
        const args = arguments;
        const passConfigDown = Mutator.passConfigDown && _config && _config.selector ? _config : (!_.isFunction(args[args.length - 2]) ? args[args.length - 2] : undefined);

        // If passing config down, the callback will be at the last position of the args, otherwise
        // it will be in _config (-2)
        const callback = _.isFunction(args[args.length - 1]) ? args[args.length - 1] : args[args.length - 2];

        // searching the elements that will get updated by id
        const findOptions = {fields: {_id: 1}, transform: null};
        if (!config.multi) {
            findOptions.limit = 1;
        }

        let docIds = this.find(selector, findOptions).fetch().map(doc => doc._id);

        if (_config && _config.upsert) {
            return Mutator._handleUpsert.call(this, Originals, selector, modifier, config, callback, docIds, passConfigDown)
        }

        // we do this because when we send to redis
        // we need the exact _ids
        // and we extend the selector, because if between finding the docIds and updating
        // another matching insert sneaked in, it's update will not be pushed
        const updateSelector = _.extend({}, selector, {
            _id: {$in: docIds}
        });

        try {
            const result = Originals.update.call(this, updateSelector, modifier, _config);

            // phony callback emulation
            if (callback) {
                callback.call(this, null, result);
            }

            const {fields} = getFields(modifier);
            dispatchUpdate(config.optimistic, this._name, config._channels, docIds, fields);

            return result;
        } catch (e) {
            if (callback) {
                return callback.call(this, e);
            } else {
                throw e;
            }
        }
    }

    /**
     * @param Originals
     * @param selector
     * @param modifier
     * @param config
     * @param callback
     * @param docIds
     */
    static _handleUpsert(Originals, selector, modifier, config, callback, docIds, passConfigDown) {
        try {
            let {insertedId, numberAffected} = {};
            if (passConfigDown) {
                ({insertedId, numberAffected} = Originals.update.call(
                    this, selector, modifier, passConfigDown, _.extend({}, config, {_returnObject: true})
                ));
            } else {
                ({insertedId, numberAffected} = Originals.update.call(
                    this, selector, modifier, _.extend({}, config, {_returnObject: true})
                ));
            }

            if (callback) {
                callback.call(this, null, insertedId, numberAffected);
            }


            if (config.pushToRedis) {
                if (insertedId) {
                    dispatchInsert(config.optimistic, this._name, config._channels, insertedId);
                } else {
                    // it means that we ran an upsert thinking there will be no docs
                    if (docIds.length === 0 || numberAffected !== docIds.length) {
                        // there were no docs initially found matching the selector
                        // however a document sneeked in, resulting in a race-condition
                        // and if we look again for that document, we cannot retrieve it.

                        // or a new document was added/modified to match selector before the actual update
                        console.warn('RedisOplog - Warning - A race condition occurred when running upsert.');
                    } else {
                        const {fields} = getFields(modifier);
                        dispatchUpdate(config.optimistic, this._name, config._channels, docIds, fields);
                    }
                }
            }

            return {insertedId, numberAffected};
        } catch (e) {
            if (callback) {
                callback.call(this, e);
            } else {
                throw e;
            }
        }
    }

    /**
     * @param Originals
     * @param selector
     * @param _config
     * @returns {*}
     */
    static remove(Originals, selector, _config) {
        const config = getMutationConfig(this._name, _config);

        if (!config.pushToRedis) {
            return Originals.remove.call(this, selector);
        }

        if (_.isString(selector)) {
            selector = {_id: selector};
        }

        const removeSelector = _.extend({}, selector);

        // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
        let docIds = this.find(selector, {
            fields: {_id: 1},
            transform: null
        }).fetch().map(doc => doc._id);

        if (!selector._id) {
            removeSelector._id = {$in: docIds};
        }

        try {
            const result = Originals.remove.call(this, removeSelector);

            if (_.isFunction(_config)) {
                _config.call(this, null);
            }

            dispatchRemove(config.optimistic, this._name, config._channels, docIds);

            return result;
        } catch (e) {
            if (_.isFunction(_config)) {
                return _config.call(this, e);
            } else {
                throw e;
            }
        }
    }
}
