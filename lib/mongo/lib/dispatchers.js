import compensateForLatency from './compensateForLatency';
import getRedisClient from '../../redis/getRedisClient';
import { Events, RedisPipe } from '../../constants';
import publish from './publish';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

const getUID = () => Random.id();

const dispatchUpdate = function (collectionName, channels, docIds, fields) {
    const uid = getUID();

    // OPTIMISTIC UI CODE
    docIds.forEach(docId => {
        compensateForLatency(channels, Events.UPDATE, uid, {_id: docId}, fields);
    });

    const client = getRedisClient();

    Meteor.defer(() => {
        docIds.forEach(docId => {
            publish(client, collectionName, channels, {
                [RedisPipe.EVENT]: Events.UPDATE,
                [RedisPipe.FIELDS]: fields,
                [RedisPipe.DOC]: {_id: docId},
                [RedisPipe.UID]: uid
            }, docId);
        })
    });
};

const dispatchRemove = function (collectionName, channels, docIds) {
    const uid = getUID();

    docIds.forEach((docId) => {
        compensateForLatency(channels, Events.REMOVE, uid, {_id: docId})
    });

    Meteor.defer(() => {
        const client = getRedisClient();

        docIds.forEach((docId) => {
            publish(client, collectionName, channels, {
                [RedisPipe.EVENT]: Events.REMOVE,
                [RedisPipe.DOC]: {_id: docId},
                [RedisPipe.UID]: uid,
            }, docId);
        })
    });
};

const dispatchInsert = function (collectionName, channels, docId) {
    const uid = getUID();

    // OPTIMISTIC UI CODE
    compensateForLatency(channels, Events.INSERT, uid, {_id: docId});

    Meteor.defer(() => {
        const client = getRedisClient();
        publish(client, this._name, channels, {
            [RedisPipe.EVENT]: Events.INSERT,
            [RedisPipe.DOC]: {_id: docId},
            [RedisPipe.UID]: uid,
        });
    });
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };