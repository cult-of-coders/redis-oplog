import { Mongo } from "meteor/mongo";
import { Random } from "meteor/random";
import { getRedisPusher } from "../redis/getRedisClient";
import { EJSON } from "meteor/ejson";
import getFields from "../utils/getFields";
import { Events, RedisPipe } from "../constants";
import containsOperators from "../mongo/lib/containsOperators";
import getChannels from "../cache/lib/getChannels";
import getDedicatedChannel from "../utils/getDedicatedChannel";

/**
 * call(Mongo.Collection).insert(data)
 * @param channelOrCollection {Mongo.Collection|string}
 */
export default class SyntheticMutator {
  /**
   * @param channels
   * @param data
   */
  static async publish(channels, data) {
    const client = getRedisPusher();

    for (const channel of channels) {
      await client.publish(channel, EJSON.stringify(data));
    }
  }

  /**
   * @param channels
   * @param data
   */
  static async insert(channels, data) {
    channels = SyntheticMutator._extractChannels(channels, data._id);

    if (!data._id) {
      data._id = Random.id();
    }

    await SyntheticMutator.publish(channels, {
      [RedisPipe.EVENT]: Events.INSERT,
      [RedisPipe.SYNTHETIC]: true,
      [RedisPipe.DOC]: data,
    });
  }

  /**
   * @param channels
   * @param _id
   * @param modifier
   */
  static async update(channels, _id, modifier) {
    channels = SyntheticMutator._extractChannels(channels, _id);

    if (!containsOperators(modifier)) {
      throw new Meteor.Error(
        "Synthetic update can only be done through MongoDB operators."
      );
    }

    const { topLevelFields } = getFields(modifier);

    let message = {
      [RedisPipe.EVENT]: Events.UPDATE,
      [RedisPipe.SYNTHETIC]: true,
      [RedisPipe.DOC]: { _id },
      [RedisPipe.MODIFIER]: modifier,
      [RedisPipe.MODIFIED_TOP_LEVEL_FIELDS]: topLevelFields,
    };

    await SyntheticMutator.publish(channels, message);
  }

  /**
   * @param channels
   * @param _id
   */
  static async remove(channels, _id) {
    channels = SyntheticMutator._extractChannels(channels, _id);

    await SyntheticMutator.publish(channels, {
      [RedisPipe.EVENT]: Events.REMOVE,
      [RedisPipe.SYNTHETIC]: true,
      [RedisPipe.DOC]: { _id },
    });
  }

  /**
   * @param channels
   * @param _id
   * @returns {*}
   * @private
   */
  static _extractChannels(channels, _id) {
    if (!Array.isArray(channels)) {
      if (channels instanceof Mongo.Collection) {
        const name = channels._name;
        channels = getChannels(name);
        if (_id) {
          channels.push(getDedicatedChannel(name, _id));
        }
      } else {
        channels = [channels];
      }
    }

    return channels;
  }
}
