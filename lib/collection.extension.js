import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import Constants, {Events} from './constants';
import getRedisClient from './utils/getRedisClient';
import getFields from './utils/getFields';
import SmartObject from './utils/SmartObject';

const client = getRedisClient();

const publish = (channel, message) => {
    client.publish(channel, EJSON.stringify(message))
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
     * @returns {*}
     */
    insert(data, cb) {
        const result = Originals.insert.call(this, data, cb);

        Meteor.defer(() => {
            const doc = this.findOne(result);

            publish(`${this._name}::*`, {
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
     * @returns {*}
     */
    update(selector, modifier, cb) {
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
            }, {
                fields: {
                    _id: 1
                }
            }).fetch();

            docs.forEach(() => {
                publish([`${this._name}::*`, `${this._name}::${doc._id}`], {
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
     * @returns {*}
     */
    remove(selector, cb) {
        let docIds = this.find(selector, {
            fields: {_id: 1}
        }).fetch().map(doc => doc._id);

        const result = Originals.update.call(this, selector, cb);

        Meteor.defer(() => {
            docIds.forEach((docId) => {
                publish([`${this._name}::${docId}`, `${this._name}::*`], {
                    [Constants.EVENT]: Events.REMOVE,
                    [Constants.DOC]: {_id: docId},
                });
            })
        });

        return result;
    }
});