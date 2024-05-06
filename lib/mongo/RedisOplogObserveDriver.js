// This code was started based on meteor/meteor github repository
// This code is MIT and licensed to Meteor

import { Tracker } from "meteor/tracker";
import getStrategy from "../processors/getStrategy";
import { Strategy } from "../constants";
import RedisSubscriber from "../redis/RedisSubscriber";
import ObservableCollection from "../cache/ObservableCollection";

let currentId = 0;
export default class RedisOplogObserveDriver {
  options = {
    cursorDescription: null,
    mongoHandle: null,
    multiplexer: null,
    ordered: null,
    matcher: null,
  };

  constructor(options) {
    this._id = currentId;
    currentId++;

    this.options = options;
    const { cursorDescription } = options;

    this._cursorDescription = options.cursorDescription;
    this._multiplexer = options.multiplexer;

    this.strategy = getStrategy(
      cursorDescription.selector,
      cursorDescription.options
    );
  }

  async init() {
    this.observableCollection = new ObservableCollection(this.options);
    await this.observableCollection.setupCollection();

    // Feels hackish to have it here, maybe move to ObservableCollections
    if (this.strategy === Strategy.DEDICATED_CHANNELS) {
      let oc = this.observableCollection;
      if (oc.selector._id) {
        oc.__containsOtherSelectorsThanId = Object.keys(oc.selector).length > 1;
      }
    }

    // This is to mitigate the issue when we run init the first time on a subscription
    // And if you are using packages like reactive-publish
    // Because inside here we do a .find().fetch(), and that's considered reactive
    await Tracker.nonreactive(async () => {
      await this.observableCollection.init();
    });

    this.redisSubscriber = new RedisSubscriber(
      this.observableCollection,
      this.strategy
    );
  }

  stop() {
    this.redisSubscriber.stop();

    this.observableCollection = null;
    this.redisSubscriber = null;

    Package["facts-base"] &&
      Package["facts-base"].Facts.incrementServerFact(
        "mongo-livedata",
        "observe-drivers-oplog",
        -1
      );
  }

  static cursorSupported(cursorDescription, matcher) {
    // First, check the options.
    var options = cursorDescription.options;

    // Did the user say no explicitly?
    // underscored version of the option is COMPAT with 1.2
    if (options.disableOplog || options._disableOplog) return false;

    // If a fields projection option is given check if it is supported by
    // minimongo (some operators are not supported).

    var fields = options.projection || options.fields;

    if (fields) {
      try {
        LocalCollection._checkSupportedProjection(fields);
      } catch (e) {
        if (e.name === "MinimongoError") {
          return false;
        } else {
          throw e;
        }
      }
    }

    // We don't allow the following selectors:
    //   - $where (not confident that we provide the same JS environment
    //             as Mongo, and can yield!)
    //   - $near (has "interesting" properties in MongoDB, like the possibility
    //            of returning an ID multiple times, though even polling maybe
    //            have a bug there)
    //           XXX: once we support it, we would need to think more on how we
    //           initialize the comparators when we create the driver.
    return !matcher.hasWhere() && !matcher.hasGeoQuery();
  }
}
