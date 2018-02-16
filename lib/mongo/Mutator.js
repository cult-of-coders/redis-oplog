import getMutationConfig from './lib/getMutationConfig';
import getFields from '../utils/getFields';
import {
    dispatchInsert,
    dispatchUpdate,
    dispatchRemove,
} from './lib/dispatchers';
import Config from '../config';
import { Events } from '../constants';

function runCallbackInBackground(fn) {
    Meteor.defer(Meteor.bindEnvironment(fn));
}

/**
 * The Mutator is the interface that does the required updates
 */
export default class Mutator {
    static init() {
        Mutator.passConfigDown = Config.passConfigDown;

        // regardless of your choice, these 2 packages must passConfigDown
        // we do like this until we find a more elegant way
        if (
            Package['aldeed:collection2'] !== undefined ||
            Package['aldeed:collection2-core'] !== undefined
        ) {
            Mutator.passConfigDown = true;
        }
    }

    static insert(Originals, data, _config) {
        const config = getMutationConfig(this, _config, {
            doc: data,
            event: Events.INSERT,
        });

        if (!config.pushToRedis) {
            return Originals.insert.call(this, data);
        }

        try {
            const docId = Originals.insert.call(this, data);

            // It's a callback
            if (_.isFunction(_config)) {
                const self = this;
                runCallbackInBackground(function() {
                    _config.call(self, null, docId);
                });
            }

            dispatchInsert(
                config.optimistic,
                this._name,
                config._channels,
                docId
            );

            return docId;
        } catch (e) {
            if (_.isFunction(_config)) {
                Meteor.defer(() => {
                    return _config.call(this, e);
                });
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
        if (_.isString(selector)) {
            selector = { _id: selector };
        }

        if (_.isFunction(_config)) {
            callback = _config;
            _config = {};
        }

        const config = getMutationConfig(this, _config, {
            event: Events.UPDATE,
            selector,
            modifier,
        });

        if (!config.pushToRedis) {
            return Originals.update.call(this, selector, modifier, config);
        }

        // searching the elements that will get updated by id
        const findOptions = { fields: { _id: 1 }, transform: null };
        if (!config.multi) {
            findOptions.limit = 1;
        }

        let docIds = this.find(selector, findOptions)
            .fetch()
            .map(doc => doc._id);

        if (config && config.upsert) {
            return Mutator._handleUpsert.call(
                this,
                Originals,
                selector,
                modifier,
                config,
                callback,
                docIds
            );
        }

        // we do this because when we send to redis
        // we need the exact _ids
        // and we extend the selector, because if between finding the docIds and updating
        // another matching insert sneaked in, it's update will not be pushed
        const updateSelector = _.extend({}, selector, {
            _id: { $in: docIds },
        });

        try {
            const result = Originals.update.call(
                this,
                updateSelector,
                modifier,
                config
            );

            // phony callback emulation
            if (callback) {
                const self = this;
                runCallbackInBackground(function() {
                    callback.call(self, null, result);
                });
            }

            const { fields } = getFields(modifier);

            dispatchUpdate(
                config.optimistic,
                this._name,
                config._channels,
                docIds,
                fields
            );

            return result;
        } catch (e) {
            if (callback) {
                const self = this;
                runCallbackInBackground(function() {
                    callback.call(self, e);
                });
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
    static _handleUpsert(
        Originals,
        selector,
        modifier,
        config,
        callback,
        docIds
    ) {
        try {
            const data = Originals.update.call(
                this,
                selector,
                modifier,
                _.extend({}, config, { _returnObject: true })
            );
            let { insertedId, numberAffected } = data;

            if (callback) {
                const self = this;
                runCallbackInBackground(function() {
                    callback.call(this, null, { insertedId, numberAffected });
                });
            }

            if (config.pushToRedis) {
                if (insertedId) {
                    dispatchInsert(
                        config.optimistic,
                        this._name,
                        config._channels,
                        insertedId
                    );
                } else {
                    // it means that we ran an upsert thinking there will be no docs
                    if (
                        docIds.length === 0 ||
                        numberAffected !== docIds.length
                    ) {
                        // there were no docs initially found matching the selector
                        // however a document sneeked in, resulting in a race-condition
                        // and if we look again for that document, we cannot retrieve it.

                        // or a new document was added/modified to match selector before the actual update
                        console.warn(
                            'RedisOplog - Warning - A race condition occurred when running upsert.'
                        );
                    } else {
                        const { fields } = getFields(modifier);
                        dispatchUpdate(
                            config.optimistic,
                            this._name,
                            config._channels,
                            docIds,
                            fields
                        );
                    }
                }
            }

            return { insertedId, numberAffected };
        } catch (e) {
            if (callback) {
                const self = this;
                runCallbackInBackground(function() {
                    callback.call(self, e);
                });
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
        if (_.isString(selector)) {
            selector = { _id: selector };
        }

        const config = getMutationConfig(this, _config, {
            selector,
            event: Events.REMOVE,
        });

        if (!config.pushToRedis) {
            return Originals.remove.call(this, selector);
        }

        const removeSelector = _.extend({}, selector);

        // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
        let docIds = this.find(selector, {
            fields: { _id: 1 },
            transform: null,
        })
            .fetch()
            .map(doc => doc._id);

        if (!selector._id) {
            removeSelector._id = { $in: docIds };
        }

        try {
            const result = Originals.remove.call(this, removeSelector);

            if (_.isFunction(_config)) {
                const self = this;
                runCallbackInBackground(function() {
                    _config.call(self, null);
                });
            }

            dispatchRemove(
                config.optimistic,
                this._name,
                config._channels,
                docIds
            );

            return result;
        } catch (e) {
            if (_.isFunction(_config)) {
                const self = this;
                runCallbackInBackground(function() {
                    _config.call(self, e);
                });
            } else {
                throw e;
            }
        }
    }
}
