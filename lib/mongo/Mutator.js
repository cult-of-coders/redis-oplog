import getMutationConfig from './lib/getMutationConfig';
import getFields from '../utils/getFields';
import {dispatchInsert, dispatchUpdate, dispatchRemove} from './lib/dispatchers';
import Config from '../config';
import {Events} from '../constants';

/**
 * The Mutator is the interface that does the required updates
 */
export default class Mutator {
    static init() {
        Mutator.passConfigDown = Config.passConfigDown;

        // regardless of your choice, these 2 packages must passConfigDown
        // we do like this until we find a more elegant way
        if (Package['aldeed:collection2'] !== undefined
            || Package['aldeed:collection2-core'] !== undefined) {
            Mutator.passConfigDown = true;
        }
    }

    static insert(Originals, data, _config) {
        const config = getMutationConfig(this, _config);

        if (!config.pushToRedis) {
            return Originals.insert.call(this, data);
        }

        try {
            const docId = Originals.insert.call(this, data);

            const mutationObject = {
                doc: {_id: docId, ...data},
                event: Events.INSERT,
            }

            Mutator._handleMutation.call(this, config, mutationObject);

            if (_.isFunction(_config)) {
                _config.call(this, null, docId);
            }

            dispatchInsert(config.optimistic, this._name, config._channels, docId);

            return docId;
        } catch (e) {
            if (_.isFunction(_config)) {
                return _config.call(this, e);
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
    static update(Originals, selector, modifier, _config, callback) {
        const config = getMutationConfig(this, _config);
        const mutationObject = {
            event: Events.UPDATE,
            selector,
            modifier
        };

        Mutator._handleMutation.call(this, config, mutationObject);

        if (!config.pushToRedis) {
            return Originals.update.call(this, selector, modifier, _config);
        }

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
     * @param  config
     * @param  mutationObject
     */
    static _handleMutation(config, mutationObject) {
        if(this._redisOplog) {
            const {mutation} = this._redisOplog;
            if (mutation) {
                mutation.apply(this, arguments);
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
    static _handleUpsert(Originals, selector, modifier, config, callback, docIds) {
        try {
            let {insertedId, numberAffected} = Originals.update.call(
                this, selector, modifier, _.extend({}, config, {_returnObject: true})
            );

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
        const config = getMutationConfig(this, _config);
        const mutationObject = {
            selector,
            event: Events.REMOVE,
        };

        Mutator._handleMutation.call(this, config, mutationObject);

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
