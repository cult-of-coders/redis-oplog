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

const dispatchEvents = function (events, optimistic, channels) {
    const fence = getWriteFence(optimistic);
    if (fence) {
        const write = fence.beginWrite();
        RedisSubscriptionManager.queue.queueTask(() => {
            events.forEach(({ event, dedicatedChannel }) => {
                channels.forEach(channelName => {
                    RedisSubscriptionManager.process(channelName, event);
                });
                RedisSubscriptionManager.process(dedicatedChannel, event);
            });
            write.committed();
        });
    }

    if (Config.externalRedisPublisher) {
        return;
    }

    Meteor.defer(() => {
        const client = getRedisPusher();
        events.forEach(({ event, dedicatedChannel }) => {
            const message = EJSON.stringify(event);
            channels.forEach(channelName => {
                client.publish(channelName, message);
            });
            client.publish(dedicatedChannel, message);
        });
    });
};


const dispatchUpdate = function (optimistic, collectionName, channels, docIds, fields) {
    const events = docIds.map(docId => {
        const event = {
            [RedisPipe.EVENT]: Events.UPDATE,
            [RedisPipe.FIELDS]: fields,
            [RedisPipe.DOC]: { _id: docId },
        };
        const dedicatedChannel = getChannelName(`${collectionName}::${docId}`);
        return { event, dedicatedChannel };
    });
    dispatchEvents(events, optimistic, channels);
};

const dispatchRemove = function (optimistic, collectionName, channels, docIds) {
    const events = docIds.map(docId => {
        const event = {
            [RedisPipe.EVENT]: Events.REMOVE,
            [RedisPipe.DOC]: { _id: docId },
        };
        const dedicatedChannel = getChannelName(`${collectionName}::${docId}`);
        return { event, dedicatedChannel };
    });
    dispatchEvents(events, optimistic, channels);
};

const dispatchInsert = function (optimistic, collectionName, channels, docId) {
    const event = {
        [RedisPipe.EVENT]: Events.INSERT,
        [RedisPipe.DOC]: { _id: docId },
    };
    const dedicatedChannel = getChannelName(`${collectionName}::${docId}`);
    const events = [{ event, dedicatedChannel }];
    dispatchEvents(events, optimistic, channels);
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };
