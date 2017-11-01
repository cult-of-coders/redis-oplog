import getMutationConfig from './lib/getMutationConfig';
import getFields from '../utils/getFields';
import {dispatchInsert, dispatchUpdate, dispatchRemove} from './lib/dispatchers';
import compensateForLatency from './lib/compensateForLatency';
import Config from '../config';
import debug from '../debug';

import {DDP} from 'meteor/ddp-client';

/**
 * The Mutator is the interface that does the required updates
 * and
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
        const config = getMutationConfig(this._name, _config);
        if(this.hooks && this.hooks.beforeInsert){
          this.hooks.beforeInsert.call(this, Originals, data, config)
        }
        if (!config.pushToRedis) {
            return Originals.insert.call(this, data);
        }

        try {
            const docId = Originals.insert.call(this, data);

            if (_.isFunction(_config)) {
                _config.call(this, null, docId);
            }
            dispatchInsert(config.optimistic, this._name, config._channels, data);
            this._id = docId;
            if(this.hooks && this.hooks.afterInsert){
              this.hooks.afterInsert.call(this, Originals, data, config)
            }

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
        const config = getMutationConfig(this._name, _config);
        if (_.isString(selector)) {
            selector = {_id: selector}
        }

        // searching the elements that will get updated by id
        const {fields} = getFields(modifier);
        const findOptions = {fields: {_id: 1,types: 1}, transform: null};
        if (!config.multi) {
            findOptions.limit = 1;
        }
        var docs = [];
        if(this.hooks && this.hooks.beforeUpdate){
          this.hooks.beforeUpdate.call(this, Originals, selector, modifier, config, callback, docs, fields, findOptions)
        }

        if (!config.pushToRedis) {
            return Originals.update.call(this, selector, modifier, _config);
        }

        debug(`docs length ${docs.length}`);
        docs.length || (docs = this.find(selector, findOptions).fetch());
        debug(`mutator hook config ${config}`);
        if (_config && _config.upsert) {
            return Mutator._handleUpsert.call(this, Originals, selector, modifier, config, callback, docs, fields,findOptions)
        }

        // we do this because when we send to redis
        // we need the exact _ids
        // and we extend the selector, because if between finding the docIds and updating
        // another matching insert sneaked in, it's update will not be pushed
        var docIds = docs.map(doc => doc._id);
        const updateSelector = _.extend({}, selector, {
            _id: {$in: docIds}
        });
        try {
            const result = Originals.update.call(this, updateSelector, modifier, _config);

            // phony callback emulation
            if (callback) {
                callback.call(this, null, result);
            }
            let afterDocs = [];
            if(this.hooks && this.hooks.afterUpdate){
              this.hooks.afterUpdate.call(this, Originals, selector, modifier, config, callback, afterDocs, fields, findOptions, docs,result)
            }
            // Call docs again for race-condition and instead of calling each id in
            debug(`afterDocs length ${afterDocs.length}`);
            findOptions.fields = fields
            afterDocs.length || (afterDocs = this.find(selector, findOptions).fetch());
            dispatchUpdate(config.optimistic, this._name, config._channels, docs, fields);



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
    static _handleUpsert(Originals, selector, modifier, config, callback, docs, fields, findOptions) {
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
                    if (docs.length === 0 || numberAffected !== docs.length) {
                        // there were no docs initially found matching the selector
                        // however a document sneeked in, resulting in a race-condition
                        // and if we look again for that document, we cannot retrieve it.

                        // or a new document was added/modified to match selector before the actual update
                        console.warn('RedisOplog - Warning - A race condition occurred when running upsert.');
                    } else {
                        docs = this.find(selector, findOptions).fetch();
                        dispatchUpdate(config.optimistic, this._name, config._channels, docs, fields);
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

        if (_.isString(selector)) {
            selector = {_id: selector};
        }

        if (!config.pushToRedis) {
            return Originals.remove.call(this, selector);
        }

        const removeSelector = _.extend({}, selector);
        var docs = [];
        if(this.hooks && this.hooks.beforeRemove){
          this.hooks.beforeRemove.call(this, Originals, selector, docs, config)
        }
        // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
        if(!docs.length)
          docs = this.find(selector, {
              fields: {_id: 1},
              transform: null
          }).fetch();
        var docIds = docs.map(doc => doc._id);
        if (!selector._id) {
            removeSelector._id = {$in: docIds};
        }

        try {
            const result = Originals.remove.call(this, removeSelector);

            if (_.isFunction(_config)) {
                _config.call(this, null);
            }

            dispatchRemove(config.optimistic, this._name, config._channels, docs);

            if(this.hooks && this.hooks.afterRemove){
              this.hooks.afterRemove.call(this, Originals, selector, config, docs);
            }

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
