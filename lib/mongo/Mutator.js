import getMutationConfig from "./lib/getMutationConfig";
import getFields from "../utils/getFields";
import {
    dispatchInsert,
    dispatchUpdate,
    dispatchRemove
} from "./lib/dispatchers";
import Config from "../config";
import { Events } from "../constants";

function runCallbackInBackground(fn) {
    Meteor.defer(Meteor.bindEnvironment(fn));
}

function protectAgainstRaceConditions(collection) {
    if (!collection._redisOplog) {
        return true;
    }

    return (
        collection._redisOplog &&
        collection._redisOplog.protectAgainstRaceConditions
    );
}

function shouldIncludePrevDocument(collection) {
    return (
        collection._redisOplog &&
        collection._redisOplog.shouldIncludePrevDocument
    );
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
            Package["aldeed:collection2"] !== undefined ||
            Package["aldeed:collection2-core"] !== undefined
        ) {
            Mutator.passConfigDown = true;
        }
    }

    static insert(Originals, data, _config) {
        const config = getMutationConfig(this, _config, {
            doc: data,
            event: Events.INSERT
        });

        if (canUseOriginalMethod(config)) {
            return Originals.insert.call(
                this,
                data,
                _.isFunction(_config) ? _config : undefined
            );
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

            let doc = { _id: docId };

            if (!protectAgainstRaceConditions(this)) {
                doc = Originals.findOne.call(this, docId);
            }

            dispatchInsert(
                config.optimistic,
                this._name,
                config._channels,
                doc
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
            modifier
        });

        if (canUseOriginalMethod(config)) {
            return Originals.update.call(
                this,
                selector,
                modifier,
                _config,
                callback
            );
        }

        // searching the elements that will get updated by id
        const findOptions = { fields: { _id: 1 }, transform: null };
        if (!config.multi) {
            findOptions.limit = 1;
        }

        let docs;
        if (shouldIncludePrevDocument(this)) {
            docs = this.find(selector, { ...findOptions, fields: {} }).fetch();
        } else {
            docs = this.find(selector, findOptions).fetch();
        }

        let docIds = docs.map(doc => doc._id);

        if (config && config.upsert) {
            return Mutator._handleUpsert.call(
                this,
                Originals,
                selector,
                modifier,
                config,
                callback,
                docIds,
                docs
            );
        }

        // we do this because when we send to redis
        // we need the exact _ids
        // and we extend the selector, because if between finding the docIds and updating
        // another matching insert sneaked in, it's update will not be pushed
        const updateSelector = _.extend({}, selector, {
            _id: { $in: docIds }
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

            if (!protectAgainstRaceConditions(this)) {
                docs = this.find(
                    { _id: { $in: docIds } },
                    {
                        ...findOptions,
                        fields: {}
                    }
                ).fetch();
            }

            const { fields } = getFields(modifier);

            dispatchUpdate(
                config.optimistic,
                this._name,
                config._channels,
                docs,
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
        docIds,
        docs
    ) {
        try {
            const data = Originals.update.call(
                this,
                selector,
                modifier,
                _.extend({}, config, { _returnObject: true })
            );

            if (callback) {
                const self = this;
                runCallbackInBackground(function() {
                    callback.call(this, null, data);
                });
            }

            if (config.pushToRedis) {
                if (data.insertedId) {
                    doc = {
                        _id: data.insertedId
                    };

                    if (!protectAgainstRaceConditions(this)) {
                        doc = this.findOne(doc._id);
                    }

                    dispatchInsert(
                        config.optimistic,
                        this._name,
                        config._channels,
                        doc
                    );
                } else {
                    // it means that we ran an upsert thinking there will be no docs
                    if (
                        docIds.length === 0 ||
                        data.numberAffected !== docIds.length
                    ) {
                        // there were no docs initially found matching the selector
                        // however a document sneeked in, resulting in a race-condition
                        // and if we look again for that document, we cannot retrieve it.

                        // or a new document was added/modified to match selector before the actual update
                        console.warn(
                            "RedisOplog - Warning - A race condition occurred when running upsert."
                        );
                    } else {
                        const { fields } = getFields(modifier);

                        docs = this.find(selector).fetch();

                        dispatchUpdate(
                            config.optimistic,
                            this._name,
                            config._channels,
                            docs,
                            fields
                        );
                    }
                }
            }

            return data;
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
        selector = Mongo.Collection._rewriteSelector(selector);

        const config = getMutationConfig(this, _config, {
            selector,
            event: Events.REMOVE
        });

        if (canUseOriginalMethod(config)) {
            return Originals.remove.call(
                this,
                selector,
                _.isFunction(_config) ? _config : undefined
            );
        }

        const removeSelector = _.extend({}, selector);
        const removeOptions = {
            fields: { _id: 1 },
            transform: null
        };

        if (shouldIncludePrevDocument(this)) {
            delete removeOptions.fields;
        }

        // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
        const docs = this.find(selector, removeOptions).fetch();
        let docIds = docs.map(doc => doc._id);

        if (!selector._id) {
            removeSelector._id = { $in: docIds };
        }

        try {
            const result = Originals.remove.call(this, removeSelector);

            if (_.isFunction(_config)) {
                const self = this;
                runCallbackInBackground(function() {
                    _config.call(self, null, result);
                });
            }

            dispatchRemove(
                config.optimistic,
                this._name,
                config._channels,
                docs
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

function canUseOriginalMethod(mutationConfig) {
    // There are two cases where we can use the original mutators rather than
    // our overriden ones:
    //
    // 1) The user set pushToRedis: false, indicating they don't need realtime
    //    updates at all.
    //
    // 2) The user is using an external redis publisher, so we don't need to
    //    figure out what to publish to redis, and this update doesn't need
    //    optimistic-ui processing, so we don't need to synchronously run
    //    observers.
    return (
        !mutationConfig.pushToRedis ||
        (Config.externalRedisPublisher && !mutationConfig.optimistic)
    );
}
