import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import Constants, {Events} from './constants';
import getRedisClient from './redis/getRedisClient';
import getFields from './utils/getFields';
import SmartObject from './utils/SmartObject';
import { _ } from 'meteor/underscore';
import debug from './debug';
import { EJSON } from 'meteor/ejson';

const publish = (channel, data) => {
    const client = getRedisClient();

    const message = EJSON.stringify(data);

    if (_.isArray(channel)) {
        channel.forEach(c => {
            client.publish(c, message);
        })
    } else {
        client.publish(channel, message);
    }
};

const getConfig = function (cb, config) {
    if (_.isObject(cb)) {
        config = cb;
    } else if (!config) {
        config = {};
    }

    return _.extend({
        pushToRedis: true,
        namespace: [this._name]
    }, config)
};

const Originals = {
    insert: Mongo.Collection.prototype.insert,
    update: Mongo.Collection.prototype.update,
    remove: Mongo.Collection.prototype.remove,
};

export default () => {
    _.extend(Mongo.Collection.prototype, {
        /**
         * @param data
         * @param cb
         * @param _config
         * @returns {*}
         */
        insert(data, cb, _config) {
            let config = getConfig.call(this, cb, _config);

            const result = Originals.insert.call(this, data, cb);

            config.pushToRedis && Meteor.defer(() => {
                const doc = this.findOne(result);

                publish(config.namespace, {
                    [Constants.EVENT]: Events.INSERT,
                    [Constants.FIELDS]: _.keys((new SmartObject(doc)).getDotObject()),
                    [Constants.DOC]: doc
                })
            });

            return result;
        },

        /**
         * @param selector
         * @param modifier
         * @param cb
         * @param _config
         * @returns {*}
         */
        update(selector, modifier, cb, _config) {
            let config = getConfig.call(this, cb, _config);

            let docIds = this.find(selector, {
                fields: {_id: 1}
            }).fetch().map(doc => doc._id);

            const result = Originals.update.call(this, selector, modifier, cb);
            const fields = getFields(modifier);

            config.pushToRedis && Meteor.defer(() => {
                let docs = this.find({
                    _id: {
                        $in: docIds
                    }
                }).fetch();

                docs.forEach(doc => {
                    let channels = [];

                    _.each(config.namespace, ns => {
                        channels.push(ns);
                        channels.push(ns + '::' + doc._id);
                    });

                    publish(channels, {
                        [Constants.EVENT]: Events.UPDATE,
                        [Constants.FIELDS]: fields,
                        [Constants.DOC]: doc
                    });
                })
            });

            return result;
        },

        /**
         * @param selector
         * @param cb
         * @param _config
         * @returns {*}
         */
        remove(selector, cb, _config) {
            let config = getConfig.call(this, cb, _config);

            let docIds = this.find(selector, {
                fields: {_id: 1}
            }).fetch().map(doc => doc._id);

            const result = Originals.remove.call(this, selector, cb);

            config.pushToRedis && Meteor.defer(() => {
                docIds.forEach((docId) => {
                    let channels = [];

                    _.each(config.namespace, ns => {
                        channels.push(ns);
                        channels.push(ns + '::' + docId);
                    });

                    publish(channels, {
                        [Constants.EVENT]: Events.REMOVE,
                        [Constants.DOC]: {_id: docId},
                    });
                })
            });

            return result;
        }
    });
}
