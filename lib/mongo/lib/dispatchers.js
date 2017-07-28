import compensateForLatency from './compensateForLatency';
import { Events, RedisPipe } from '../../constants';
import publish from './publish';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

const getUID = () => Random.id();

const dispatchUpdate = function (optimistic, collectionName, channels, docs, fields) {
    let uid;

    if (optimistic) {
        uid = getUID();

        // OPTIMISTIC UI CODE
        docs.forEach(doc => {
            compensateForLatency(channels, collectionName, Events.UPDATE, uid, doc, fields);
        });
    }

    Meteor.defer(() => {
        docs.forEach(doc => {
            publish(collectionName, channels, {
                [RedisPipe.EVENT]: Events.UPDATE,
                [RedisPipe.FIELDS]: fields,
                [RedisPipe.DOC]: {_id: doc._id},
                [RedisPipe.UID]: uid
            }, doc._id);
        })
    });
};

const dispatchRemove = function (optimistic, collectionName, channels, docs) {
    let uid;

    if (optimistic) {
        uid = getUID();

        docs.forEach((doc) => {
            compensateForLatency(channels, collectionName, Events.REMOVE, uid, doc)
        });
    }

    Meteor.defer(() => {
        docs.forEach((doc) => {
            publish(collectionName, channels, {
                [RedisPipe.EVENT]: Events.REMOVE,
                [RedisPipe.DOC]: {_id: doc._id},
                [RedisPipe.UID]: uid,
            }, doc._id);
        })
    });
};

const dispatchInsert = function (optimistic, collectionName, channels, doc) {
    let uid;

    if (optimistic) {
        uid = getUID();

        // OPTIMISTIC UI CODE
        compensateForLatency(channels, collectionName, Events.INSERT, uid, doc);
    }

    Meteor.defer(() => {
        publish(this._name, channels, {
            [RedisPipe.EVENT]: Events.INSERT,
            [RedisPipe.DOC]: {_id: doc._id},
            [RedisPipe.UID]: uid,
        });
    });
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };
