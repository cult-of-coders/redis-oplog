import compensateForLatency from './compensateForLatency';
import { Events, RedisPipe } from '../../constants';
import publish from './publish';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import Config from '../../config';

const dispatchUpdate = function(
    optimistic,
    collectionName,
    channels,
    docIds,
    fields
) {
    if (optimistic) {
        docIds.forEach(docId => {
            compensateForLatency(
                channels,
                collectionName,
                Events.UPDATE,
                { _id: docId },
                fields
            );
        });
    }

    if (!Config.externalRedisPublisher) {
        Meteor.defer(() => {
            docIds.forEach(docId => {
                publish(
                    collectionName,
                    channels,
                    {
                        [RedisPipe.EVENT]: Events.UPDATE,
                        [RedisPipe.FIELDS]: fields,
                        [RedisPipe.DOC]: { _id: docId }
                    },
                    docId
                );
            });
        });
    }
};

const dispatchRemove = function(optimistic, collectionName, channels, docIds) {
    if (optimistic) {
        docIds.forEach(docId => {
            compensateForLatency(channels, collectionName, Events.REMOVE, {
                _id: docId
            });
        });
    }

    if (!Config.externalRedisPublisher) {
        Meteor.defer(() => {
            docIds.forEach(docId => {
                publish(
                    collectionName,
                    channels,
                    {
                        [RedisPipe.EVENT]: Events.REMOVE,
                        [RedisPipe.DOC]: { _id: docId }
                    },
                    docId
                );
            });
        });
    }
};

const dispatchInsert = function(optimistic, collectionName, channels, docId) {
    if (optimistic) {
        // OPTIMISTIC UI CODE
        compensateForLatency(channels, collectionName, Events.INSERT, {
            _id: docId
        });
    }

    if (!Config.externalRedisPublisher) {
        Meteor.defer(() => {
            publish(this._name, channels, {
                [RedisPipe.EVENT]: Events.INSERT,
                [RedisPipe.DOC]: { _id: docId }
            });
        });
    }
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };
