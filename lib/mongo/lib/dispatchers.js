import { Meteor } from "meteor/meteor";
import { DDPServer } from "meteor/ddp-server";
import { EJSON } from "meteor/ejson";
import { Events, RedisPipe } from "../../constants";
import RedisSubscriptionManager from "../../redis/RedisSubscriptionManager";
import { getRedisPusher } from "../../redis/getRedisClient";
import getDedicatedChannel from "../../utils/getDedicatedChannel";
import Config from "../../config";
import OptimisticInvocation from "../OptimisticInvocation";

const dispatchEvents = async function (
  optimistic,
  collectionName,
  channels,
  events
) {
  if (optimistic) {
    await OptimisticInvocation.withValue(true, async () => {
      for (const event of events) {
        const docId = event[RedisPipe.DOC]._id;
        const dedicatedChannel = getDedicatedChannel(collectionName, docId);

        await RedisSubscriptionManager.process(dedicatedChannel, event);
        for (const channelName of channels) {
          await RedisSubscriptionManager.process(channelName, event);
        }
      }
    });
  }

  if (Config.externalRedisPublisher) {
    return;
  }

  Meteor.defer(async () => {
    const client = getRedisPusher();
    for (const event of events) {
      const message = EJSON.stringify(event);
      for (const channelName of channels) {
        await client.publish(channelName, message);
      }
      const docId = event[RedisPipe.DOC]._id;
      const dedicatedChannel = getDedicatedChannel(collectionName, docId);
      await client.publish(dedicatedChannel, message);
    }
  });
};

const dispatchUpdate = async function (
  optimistic,
  collectionName,
  channels,
  docs,
  fields
) {
  const uid = optimistic ? RedisSubscriptionManager.uid : null;

  const events = docs.map((doc) => ({
    [RedisPipe.EVENT]: Events.UPDATE,
    [RedisPipe.FIELDS]: fields,
    [RedisPipe.DOC]: doc,
    [RedisPipe.UID]: uid,
  }));

  await dispatchEvents(optimistic, collectionName, channels, events);
};

const dispatchRemove = async function (
  optimistic,
  collectionName,
  channels,
  docs
) {
  const uid = optimistic ? RedisSubscriptionManager.uid : null;

  const events = docs.map((doc) => ({
    [RedisPipe.EVENT]: Events.REMOVE,
    [RedisPipe.DOC]: doc,
    [RedisPipe.UID]: uid,
  }));

  await dispatchEvents(optimistic, collectionName, channels, events);
};

const dispatchInsert = async function (
  optimistic,
  collectionName,
  channels,
  doc
) {
  const uid = optimistic ? RedisSubscriptionManager.uid : null;

  const event = {
    [RedisPipe.EVENT]: Events.INSERT,
    [RedisPipe.DOC]: doc,
    [RedisPipe.UID]: uid,
  };

  await dispatchEvents(optimistic, collectionName, channels, [event]);
};

export { dispatchInsert, dispatchUpdate, dispatchRemove };
