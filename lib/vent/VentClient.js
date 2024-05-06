import { VentConstants } from "../constants";
import { Random } from "meteor/random";
import { DDPCommon } from "meteor/ddp-common";

/**
 * Handles vents inside Meteor
 */
export default class VentClient {
  constructor() {
    this.store = {};
    this.listen(Meteor.connection);
  }

  subscribe(name, ...args) {
    const subscription = new VentClientSubscription(this, name);
    this.add(subscription);

    return subscription.subscribe(...args);
  }

  listen(ddpConnection) {
    ddpConnection._stream.on("message", (raw_msg) => {
      // avoid parsing unnecessary ddp events
      const search = `{"msg":"changed","${VentConstants.PREFIX}":"1`;
      if (raw_msg.substr(0, search.length) !== search) {
        return;
      }

      const msg = DDPCommon.parseDDP(raw_msg);
      const subscription = this.store[msg.id];
      if (subscription) {
        subscription.handle(msg[VentConstants.EVENT_VARIABLE]);
      }
    });
  }

  /**
   * {VentClientSubscription}
   * @param subscription
   */
  add(subscription) {
    this.store[subscription.id] = subscription;
  }

  /**
   * @param {VentClientSubscription} subscription
   */
  remove(subscription) {
    delete this.store[subscription.id];
  }
}

/**
 * Handles Vent subscription
 */
class VentClientSubscription {
  constructor(client, name) {
    this.client = client;
    this._name = name;
    this._id = Random.id();
  }

  get id() {
    return VentConstants.getPrefix(this._id, this._name);
  }

  /**
   * Subscribes to Meteor
   *
   * @param args
   * @returns {*}
   */
  subscribe(...args) {
    const self = this;

    const handler = Meteor.subscribe(this._name, this._id, ...args);

    const oldStop = handler.stop;
    Object.assign(handler, {
      listen(eventHandler) {
        if (!_.isFunction(eventHandler)) {
          throw new Meteor.Error(
            "invalid-argument",
            "You should pass a function to listen()"
          );
        }

        self._eventHandler = eventHandler;
      },
      stop() {
        self.client.remove(self);

        return oldStop.call(handler);
      },
    });

    return handler;
  }

  /**
   * Watches the incomming events
   */
  handle(event) {
    if (this._eventHandler) {
      this._eventHandler(event);
    } else {
    }
  }
}
