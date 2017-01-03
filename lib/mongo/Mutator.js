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

    static prepareArgumentsForCall(firstArguments, callbackOrConfig) {
        if (_.isFunction(callbackOrConfig)) {
            firstArguments.push(callbackOrConfig);
        } else {
            if (Mutator.passConfigDown) {
                firstArguments.push(callbackOrConfig);
            }
        }

        return firstArguments;
    }

    static insert(Originals, data, _config) {
        const config = getMutationConfig(this._name, _config);
        const args = Mutator.prepareArgumentsForCall([data], _config);

        const docId = Originals.insert.apply(this, args);

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

        // searching the elements that will get updated by id
        const findOptions = {fields: {_id: 1}, transform: null};
        if (!config.multi) {
            findOptions.limit = 1;
        }

        let docIds = this.find(selector, findOptions).fetch().map(doc => doc._id);

        const result = Originals.update.call(this, {_id: {$in: docIds}}, modifier, _config, callback);

        // retrieving the elements by id and with the required fields
        const {fields, topLevelFields} = getFields(modifier);

        // OPTIMISTIC UI CODE
        // TODO: why not ?
        // docs.forEach(doc => {
        //     compensateForLatency(config._channels, Events.UPDATE, doc);
        // });

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
     * @param _config
     * @returns {*}
     */
    static remove(Originals, selector, _config) {
        const config = getMutationConfig(this._name, _config);

        // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
        let docIds = this.find(selector, {
            fields: {_id: 1},
            transform: null
        }).fetch().map(doc => doc._id);

        Originals.remove.call(this, selector, _.isFunction(_config) ? _config : undefined);

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
