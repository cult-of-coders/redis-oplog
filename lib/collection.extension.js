import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import Constants, {Events} from './constants';
import getRedisClient from './utils/getRedisClient';
import getFields from './utils/getFields';
import SmartObject from './utils/SmartObject';
import { _ } from 'meteor/underscore';
import { EJSON } from 'meteor/ejson';

const client = getRedisClient();

const publish = (channel, data) => {
    const message = EJSON.stringify(data);

    if (_.isArray(channel)) {
        channel.forEach(c => {
            client.publish(c, message);
        })
    } else {
        client.publish(channel, message);
    }
};

const Originals = {
    insert: Mongo.Collection.prototype.insert,
    update: Mongo.Collection.prototype.update,
    remove: Mongo.Collection.prototype.remove,
};

_.extend(Mongo.Collection.prototype, {
    /**
     * @param data
     * @param cb
     * @param config
     * @returns {*}
     */
    insert(data, cb, config) {
        if (_.isObject(cb) && config === undefined) {
            config = cb;
            cb = undefined;
        }

        const result = Originals.insert.call(this, data, cb);

        Meteor.defer(() => {
            const doc = this.findOne(result);

            publish(`${this._name}`, {
                [Constants.EVENT]: Events.INSERT,
                [Constants.DOCUMENT_ID]: doc._id,
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
     * @param config
     * @returns {*}
     */
    update(selector, modifier, cb, config) {
        if (_.isObject(cb) && config === undefined) {
            config = cb;
            cb = undefined;
        }

        let docIds = this.find(selector, {
            fields: {_id: 1}
        }).fetch().map(doc => doc._id);

        const result = Originals.update.call(this, selector, modifier, cb);
        const fields = getFields(modifier);

        Meteor.defer(() => {
            let docs = this.find({
                _id: {
                    $in: docIds
                }
            }).fetch();

            docs.forEach(doc => {
                publish([`${this._name}`, `${this._name}::${doc._id}`], {
                    [Constants.EVENT]: Events.UPDATE,
                    [Constants.DOCUMENT_ID]: doc._id,
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
     * @param config
     * @returns {*}
     */
    remove(selector, cb, config) {
        if (_.isObject(cb) && config === undefined) {
            config = cb;
            cb = undefined;
        }

        let docIds = this.find(selector, {
            fields: {_id: 1}
        }).fetch().map(doc => doc._id);

        const result = Originals.remove.call(this, selector, cb);

        Meteor.defer(() => {
            docIds.forEach((docId) => {
                publish([`${this._name}::${docId}`, `${this._name}`], {
                    [Constants.EVENT]: Events.REMOVE,
                    [Constants.DOC]: {_id: docId},
                });
            })
        });

        return result;
    }
});