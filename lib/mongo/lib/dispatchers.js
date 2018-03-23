import { Meteor } from 'meteor/meteor';
import { DDPServer } from 'meteor/ddp-server';
import { EJSON } from 'meteor/ejson';
import { Events, RedisPipe } from '../../constants';
import RedisSubscriptionManager from '../../redis/RedisSubscriptionManager';
import { getRedisPusher } from "../../redis/getRedisClient";
import getChannelName from '../../utils/getChannelName';
import Config from '../../config';

const getWriteFence = function (optimistic) {
    if (optimistic && DDPServer._CurrentWriteFence) {
        return DDPServer._CurrentWriteFence.get();
    }
    return null;
};

const dispatchEvents = function (fence, collectionName, channels, events) {
    if (fence) {
        const write = fence.beginWrite();
        RedisSubscriptionManager.queue.queueTask(() => {
            try {
              events.forEach((event) => {
                channels.forEach(channelName => {
                  RedisSubscriptionManager.process(channelName, event);
                });
                const docId = event[RedisPipe.DOC]._id;
                const dedicatedChannel = getChannelName(`${collectionName}::${docId}`);
                RedisSubscriptionManager.process(dedicatedChannel, event);
              });
            } finally {
              write.committed();
            }
        });
    }

    if (Config.externalRedisPublisher) {
        return;
    }

    Meteor.defer(() => {
        const client = getRedisPusher();
        events.forEach((event) => {
            const message = EJSON.stringify(event);
            channels.forEach(channelName => {
                client.publish(channelName, message);
            });
            const docId = event[RedisPipe.DOC]._id;
            const dedicatedChannel = getChannelName(`${collectionName}::${docId}`);
            client.publish(dedicatedChannel, message);
        });
    });
};


const dispatchUpdate = function (optimistic, collectionName, channels, docIds, fields) {
    const fence = getWriteFence(optimistic);
    const uid = fence ? RedisSubscriptionManager.uid : null;
    const events = docIds.map(docId => ({
        [RedisPipe.EVENT]: Events.UPDATE,
        [RedisPipe.FIELDS]: fields,
        [RedisPipe.DOC]: { _id: docId },
        [RedisPipe.UID]: uid,
    }));
    dispatchEvents(fence, collectionName, channels, events);
};

const dispatchRemove = function (optimistic, collectionName, channels, docIds) {
    const fence = getWriteFence(optimistic);
    const uid = fence ? RedisSubscriptionManager.uid : null;
    const events = docIds.map(docId => ({
        [RedisPipe.EVENT]: Events.REMOVE,
        [RedisPipe.DOC]: { _id: docId },
        [RedisPipe.UID]: uid,
    }));
    dispatchEvents(fence, collectionName, channels, events);
};

const dispatchInsert = function (optimistic, collectionName, channels, docId) {
    const fence = getWriteFence(optimistic);
    const uid = fence ? RedisSubscriptionManager.uid : null;
    const event = {
        [RedisPipe.EVENT]: Events.INSERT,
        [RedisPipe.DOC]: { _id: docId },
        [RedisPipe.UID]: uid,
    };
    dispatchEvents(fence, collectionName, channels, [event]);
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };
