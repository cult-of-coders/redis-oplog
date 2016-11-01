import { Meteor } from 'meteor/meteor';
import getRedisClient from './getRedisClient';
import Constants, { Events } from './constants';

export default function enableReactivity(collection) {
    const client = getRedisClient();

    const publish = (channel, message) => {
        client.publish(channel, JSON.stringify(message))
    };

    collection.after.insert(function (userId, doc) {
        Meteor.defer(() => {
            const channel = `${collection._name}::*`;

            publish(channel, {
                [Constants.EVENT]: Events.INSERT,
                [Constants.DOCUMENT_ID]: doc._id,
                [Constants.DOC]: doc
            })
        })
    });

    collection.after.update(function (userId, doc, fieldNames, modifier) {
        Meteor.defer(() => {
            publish([`${collection._name}::*`, `${collection._name}::${doc._id}`], {
                [Constants.EVENT]: Events.UPDATE,
                [Constants.DOCUMENT_ID]: doc._id,
                [Constants.MODIFIER]: modifier,
                [Constants.DOC]: doc
            });
        })
    });

    collection.after.remove(function (userId, doc) {
        Meteor.defer(() => {
            publish(`${collection._name}::${doc._id}`, {
                [Constants.EVENT]: Events.REMOVE,
            });

            publish(`${collection._name}::*`, {
                [Constants.EVENT]: Events.REMOVE,
                [Constants.DOC]: doc,
            });
        })
    })
}