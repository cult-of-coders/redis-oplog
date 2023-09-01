import { Meteor } from 'meteor/meteor';
import { DDPServer } from 'meteor/ddp-server';
import { EJSON } from 'meteor/ejson';
import { Events, RedisPipe } from '../../constants';
import RedisSubscriptionManager from '../../redis/RedisSubscriptionManager';
import { getRedisPusher } from '../../redis/getRedisClient';
import getDedicatedChannel from '../../utils/getDedicatedChannel';
import Config from '../../config';
import OptimisticInvocation from '../OptimisticInvocation';

const dispatchEvents = function(config, collectionName, channels, events) {
    const { optimistic } = config;
    if (optimistic) {
        OptimisticInvocation.withValue(true, () => {
            events.forEach(event => {
                const docId = event[RedisPipe.DOC]._id;
                const dedicatedChannel = getDedicatedChannel(collectionName, docId, config);
                RedisSubscriptionManager.process(dedicatedChannel, event);

                channels.forEach(channelName => {
                    RedisSubscriptionManager.process(channelName, event);
                });
            });
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
            const dedicatedChannel = getDedicatedChannel(collectionName, docId, config);
            client.publish(dedicatedChannel, message);
        });
    });
};

const dispatchUpdate = function(
    config,
    collectionName,
    channels,
    docs,
    fields
) {
    const { optimistic } = config;
    const uid = optimistic ? RedisSubscriptionManager.uid : null;

    const events = docs.map(doc => ({
        [RedisPipe.EVENT]: Events.UPDATE,
        [RedisPipe.FIELDS]: fields,
        [RedisPipe.DOC]: doc,
        [RedisPipe.UID]: uid,
    }));

    dispatchEvents(config, collectionName, channels, events);
};

const dispatchRemove = function(config, collectionName, channels, docs) {
    const { optimistic } = config;
    const uid = optimistic ? RedisSubscriptionManager.uid : null;

    const events = docs.map(doc => ({
        [RedisPipe.EVENT]: Events.REMOVE,
        [RedisPipe.DOC]: doc,
        [RedisPipe.UID]: uid,
    }));

    dispatchEvents(config, collectionName, channels, events);
};

const dispatchInsert = function(config, collectionName, channels, doc) {
    const { optimistic } = config;
    const uid = optimistic ? RedisSubscriptionManager.uid : null;

    const event = {
        [RedisPipe.EVENT]: Events.INSERT,
        [RedisPipe.DOC]: doc,
        [RedisPipe.UID]: uid,
    };

    dispatchEvents(config, collectionName, channels, [event]);
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };
