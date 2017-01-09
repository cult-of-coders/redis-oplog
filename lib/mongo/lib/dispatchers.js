import compensateForLatency from './compensateForLatency';
import getRedisClient from '../../redis/getRedisClient';
import { Events, RedisPipe } from '../../constants';
import publish from './publish';
import { Meteor } from 'meteor/meteor';

const dispatchUpdate = function (collectionName, channels, docIds, fields) {
    // OPTIMISTIC UI CODE
    docIds.forEach(docId => {
        compensateForLatency(channels, Events.UPDATE, {_id: docId}, fields);
    });

    const client = getRedisClient();

    Meteor.defer(() => {
        docIds.forEach(docId => {
            publish(client, collectionName, channels, {
                [RedisPipe.EVENT]: Events.UPDATE,
                [RedisPipe.FIELDS]: fields,
                [RedisPipe.DOC]: {_id: docId}
            }, docId);
        })
    });
};

const dispatchRemove = function (collectionName, channels, docIds) {
    docIds.forEach((docId) => {
        compensateForLatency(channels, Events.REMOVE, {_id: docId})
    });

    Meteor.defer(() => {
        const client = getRedisClient();

        docIds.forEach((docId) => {
            publish(client, collectionName, channels, {
                [RedisPipe.EVENT]: Events.REMOVE,
                [RedisPipe.DOC]: {_id: docId},
            }, docId);
        })
    });
};

const dispatchInsert = function (collectionName, channels, docId) {
    // OPTIMISTIC UI CODE
    compensateForLatency(channels, Events.INSERT, {_id: docId});

    Meteor.defer(() => {
        const client = getRedisClient();
        publish(client, this._name, channels, {
            [RedisPipe.EVENT]: Events.INSERT,
            [RedisPipe.DOC]: {_id: docId}
        });
    });
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };