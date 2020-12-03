import { Meteor } from 'meteor/meteor';
import { EJSON } from 'meteor/ejson';
import { Events, RedisPipe } from '../../constants';
import RedisSubscriptionManager from '../../redis/RedisSubscriptionManager';
import { getRedisPusher } from '../../redis/getRedisClient';
import getDedicatedChannel from '../../utils/getDedicatedChannel';
import Config from '../../config';
import OptimisticInvocation from '../OptimisticInvocation';

const dispatchEvents = function dispatchEventsFn(optimistic, collectionName, channels, events) {
    if (optimistic) {
      OptimisticInvocation.withValue(true, () => {
            events.forEach(event => {
                const docId = event[RedisPipe.DOC]._id;
                const dedicatedChannel = getDedicatedChannel(collectionName, docId);
                RedisSubscriptionManager.process(dedicatedChannel, [event]);
            });
            channels.forEach(channel => RedisSubscriptionManager.process(channel, events));
        });
    }

    if (Config.externalRedisPublisher) {
        return;
    }

    Meteor.defer(() => {
        const client = getRedisPusher();
        events.forEach(event => {
            const message = EJSON.stringify(event);
            channels.forEach(channelName => {
                client.publish(channelName, message);
            });
            const docId = event[RedisPipe.DOC]._id;
            const dedicatedChannel = getDedicatedChannel(collectionName, docId);
            client.publish(dedicatedChannel, message);
        });
    });
};

const dispatchUpdate = function(
    optimistic,
    collectionName,
    channels,
    docs,
    fields
) {
    const uid = optimistic ? RedisSubscriptionManager.uid : null;

    const events = docs.map(doc => ({
        [RedisPipe.EVENT]: Events.UPDATE,
        [RedisPipe.FIELDS]: fields,
        [RedisPipe.DOC]: doc,
        [RedisPipe.UID]: uid,
    }));

    dispatchEvents(optimistic, collectionName, channels, events);
};

const dispatchRemove = function(optimistic, collectionName, channels, docs) {
    const uid = optimistic ? RedisSubscriptionManager.uid : null;

    const events = docs.map(doc => ({
        [RedisPipe.EVENT]: Events.REMOVE,
        [RedisPipe.DOC]: doc,
        [RedisPipe.UID]: uid,
    }));

    dispatchEvents(optimistic, collectionName, channels, events);
};

const dispatchInsert = function(optimistic, collectionName, channels, doc) {
    const uid = optimistic ? RedisSubscriptionManager.uid : null;

    const event = {
        [RedisPipe.EVENT]: Events.INSERT,
        [RedisPipe.DOC]: doc,
        [RedisPipe.UID]: uid,
    };

    dispatchEvents(optimistic, collectionName, channels, [event]);
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };
