import compensateForLatency from './compensateForLatency';
import { Events, RedisPipe } from '../../constants';
import publish from './publish';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

const getUID = () => Random.id();

const dispatchUpdate = function (optimistic, collectionName, channels, docIds, fields) {
    let uid;

    if (optimistic) {
        uid = getUID();

        // OPTIMISTIC UI CODE
        docIds.forEach(docId => {
            compensateForLatency(channels, Events.UPDATE, uid, {_id: docId}, fields);
        });
    }

    Meteor.defer(() => {
        docIds.forEach(docId => {
            publish(collectionName, channels, {
                [RedisPipe.EVENT]: Events.UPDATE,
                [RedisPipe.FIELDS]: fields,
                [RedisPipe.DOC]: {_id: docId},
                [RedisPipe.UID]: uid
            }, docId);
        })
    });
};

const dispatchRemove = function (optimistic, collectionName, channels, docIds) {
    let uid;

    if (optimistic) {
        uid = getUID();

        docIds.forEach((docId) => {
            compensateForLatency(channels, Events.REMOVE, uid, {_id: docId})
        });
    }

    Meteor.defer(() => {
        docIds.forEach((docId) => {
            publish(collectionName, channels, {
                [RedisPipe.EVENT]: Events.REMOVE,
                [RedisPipe.DOC]: {_id: docId},
                [RedisPipe.UID]: uid,
            }, docId);
        })
    });
};

const dispatchInsert = function (optimistic, collectionName, channels, docId) {
    let uid;

    if (optimistic) {
        uid = getUID();

        // OPTIMISTIC UI CODE
        compensateForLatency(channels, Events.INSERT, uid, {_id: docId});
    }

    Meteor.defer(() => {
        publish(this._name, channels, {
            [RedisPipe.EVENT]: Events.INSERT,
            [RedisPipe.DOC]: {_id: docId},
            [RedisPipe.UID]: uid,
        });
    });
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };