import { VentConstants } from "../constants";
import { Meteor } from "meteor/meteor";
import { _ } from "meteor/underscore";
import Config from "../config";

// TODO:
// Unify listening of events with RedisSubscriptionManager

export default class Vent {
  /**
   * @param name
   * @param fn
   * @returns {*|any|Observable}
   */
  static publish(name, fn) {
    // check initialization
    if (!Config.isInitialized) {
      throw new Meteor.Error(
        "not-initialized",
        "RedisOplog is not initialized at the time of defining this publish. Make sure you initialize it before"
      );
    }

    if (_.isObject(name)) {
      _.each(name, (fn, _name) => {
        Vent.publish(_name, fn);
      });

      return;
    }

    // validate if everything is in order
    Vent._validateArguments(name, fn);

    // create the publication properly
    return Vent._createPublishEndPoint(name, fn);
  }

  /**
   * @param {string} channel
   * @param {object} object
   */
  static async emit(channel, object) {
    const { pubSubManager } = Config;

    await pubSubManager.publish(channel, object);
  }

  /**
   * Creates the publish endpoint
   *
   * @param name
   * @param fn
   * @returns {*|any|Observable}
   * @private
   */
  static _createPublishEndPoint(name, fn) {
    return Meteor.publish(name, async function (collectionId, ...args) {
      Vent._extendPublishContext(this, name, collectionId);

      try {
        await fn.call(this, ...args);
      } catch (e) {
        // we do this because the errors in here are silenced
        console.error(e);
        throw e;
      }

      this.ready();
    });
  }

  /**
   * @param context
   * @param name
   * @param collectionId
   * @private
   */
  static _extendPublishContext(context, name, collectionId) {
    const channelHandlers = [];
    const { pubSubManager } = Config;

    Object.assign(context, {
      on(channel, redisEventHandler) {
        // create the handler for this channel
        const handler = async function (message) {
          const data = await redisEventHandler.call(context, message);

          if (data) {
            context._session.send({
              msg: "changed",
              [VentConstants.PREFIX]: "1",
              id: VentConstants.getPrefix(collectionId, name),
              [VentConstants.EVENT_VARIABLE]: data,
            });
          }
        };

        channelHandlers.push({ channel, handler });
        pubSubManager.subscribe(channel, handler);
      },
    });

    context.onStop(function () {
      channelHandlers.forEach(({ channel, handler }) => {
        pubSubManager.unsubscribe(channel, handler);
      });
    });
  }

  /**
   * @param name
   * @param fn
   * @private
   */
  static _validateArguments(name, fn) {
    // validate arguments
    if (!_.isString(name)) {
      if (!_.isObject(name)) {
        throw new Meteor.Error("invalid-definition", "Argument is invalid");
      }
    } else {
      if (!_.isFunction(fn)) {
        throw new Meteor.Error(
          "invalid-definition",
          "The second argument needs to be a function"
        );
      }
    }
  }
}
