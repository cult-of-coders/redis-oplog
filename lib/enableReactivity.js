import { Meteor } from 'meteor/meteor';
import getRedisClient from './getRedisClient';
import Constants from './constants';

export default function enableReactivity(collection) {
    const client = getRedisClient();

    const publish = (channel, message) => {
        client.publish(channel, JSON.stringify(message))
    };

    collection.after.insert(function (userId, doc) {
        Meteor.defer(() => {
            const channel = `${collection._name}::*`;

            publish(channel, {
                [Constants.TYPE]: Constants.INSERT,
                [Constants.DOCUMENT_ID]: doc._id,
                [Constants.DATA]: doc
            })
        })
    });

    collection.after.update(function (userId, doc, fieldNames, modifier) {
        Meteor.defer(() => {
            publish(`${collection._name}::${doc._id}`, {
                [Constants.TYPE]: Constants.UPDATE,
                [Constants.MODIFIER]: modifier,
                [Constants.DATA]: doc
            });

            publish(`${collection._name}::*`, {
                [Constants.TYPE]: Constants.UPDATE,
                [Constants.DOCUMENT_ID]: doc._id,
                [Constants.MODIFIER]: modifier,
                [Constants.DATA]: doc
            });
        })
    });

    collection.after.remove(function (userId, doc) {
        Meteor.defer(() => {
            publish(`${collection._name}::${doc._id}`, {
                [Constants.TYPE]: Constants.REMOVE,
            });

            publish(`${collection._name}::*`, {
                [Constants.TYPE]: Constants.REMOVE,
                [Constants.DOCUMENT_ID]: doc._id,
            });
        })
    })
}