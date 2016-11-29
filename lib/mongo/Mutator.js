import { Meteor } from 'meteor/meteor';
import getMutationConfig from './lib/getMutationConfig';
import publish from './lib/publish';
import getFields from '../utils/getFields';
import {RedisPipe, Events} from '../constants';
import SmartObject from '../utils/SmartObject';
import getRedisClient from '../redis/getRedisClient';
import compensateForLatency from './compensateForLatency';

export default class Mutator {
    static insert(Originals, data, config) {
        config = getMutationConfig(this._name, config);

        const result = Originals.insert.call(this, data, config);
        const doc = this.findOne(result, { transform: null });

        // OPTIMISTIC UI CODE
        compensateForLatency(config._channels, Events.INSERT, doc);

        if (config.pushToRedis) {
            Meteor.defer(() => {
                const client = getRedisClient();
                publish(client, this._name, config._channels, {
                    [RedisPipe.EVENT]: Events.INSERT,
                    [RedisPipe.FIELDS]: _.keys((new SmartObject(doc)).getDotObject()),
                    [RedisPipe.DOC]: doc
                })
            });
        }

        return result;
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
        const {fields, fieldsOptions} = getFields(modifier);

        // retrieve the docs, with the proper fieldOptions, too see how they have been modified
        let docs = this.find(
            {_id: {$in: docIds}},
            {fields: fieldsOptions, transform: null}
        ).fetch();

        // OPTIMISTIC UI CODE
        docs.forEach(doc => {
            compensateForLatency(config._channels, Events.UPDATE, doc);
        });

        if (config.pushToRedis) {
            const client = getRedisClient();

            Meteor.defer(() => {
                docs.forEach(doc => {
                    publish(client, this._name, config._channels, {
                        [RedisPipe.EVENT]: Events.UPDATE,
                        [RedisPipe.FIELDS]: fields,
                        [RedisPipe.DOC]: doc
                    }, doc._id);
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