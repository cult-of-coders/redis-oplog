import { Meteor } from 'meteor/meteor';
import getMutationConfig from './lib/getMutationConfig';
import publish from './lib/publish';
import getFields from '../utils/getFields';
import {RedisPipe, Events} from '../constants';
import getRedisClient from '../redis/getRedisClient';
import compensateForLatency from './compensateForLatency';

export default class Mutator {
    static insert(Originals, data, config) {
        config = getMutationConfig(this._name, config);

        const docId = Originals.insert.call(this, data, config);

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
     * @param config
     * @returns {*}
     */
    static update(Originals, selector, modifier, config) {
        config = getMutationConfig(this._name, config);

        // searching the elements that will get updated by id
        const findOptions = {fields: {_id: 1}, transform: null};
        if (!config.multi) {
            findOptions.limit = 1;
        }

        let docIds = this.find(selector, findOptions).fetch().map(doc => doc._id);

        const result = Originals.update.call(this, selector, modifier, config);

        // retrieving the elements by id and with the required fields
        const {fields, topLevelFields} = getFields(modifier);

        // OPTIMISTIC UI CODE
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
     * @param config
     * @returns {*}
     */
    static remove(Originals, selector, config) {
        config = getMutationConfig(this._name, config);

        // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
        let docIds = this.find(selector, {
            fields: {_id: 1},
            transform: null
        }).fetch().map(doc => doc._id);

        Originals.remove.call(this, selector);

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
