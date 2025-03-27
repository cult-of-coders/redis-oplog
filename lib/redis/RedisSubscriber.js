import { Strategy } from "../constants";
import { getProcessor } from "../processors";
import { Meteor } from "meteor/meteor";
import extractIdsFromSelector from "../utils/extractIdsFromSelector";
import RedisSubscriptionManager from "./RedisSubscriptionManager";
import syntheticProcessor from "../processors/synthetic";
import getDedicatedChannel from "../utils/getDedicatedChannel";

export default class RedisSubscriber {
  /**
   * @param observableCollection
   * @param strategy
   */
  constructor(observableCollection, strategy) {
    this.observableCollection = observableCollection;
    this.strategy = strategy;
    this.processor = getProcessor(strategy);

    // We do this because we override the behavior of dedicated "_id" channels
    this.channels = this.getChannels(this.observableCollection.channels);

    RedisSubscriptionManager.attach(this);
  }

  /**
   * @param channels
   * @returns {*}
   */
  getChannels(channels) {
    const collectionName = this.observableCollection.collectionName;

    switch (this.strategy) {
      case Strategy.DEFAULT:
      case Strategy.LIMIT_SORT:
        return channels;
      case Strategy.DEDICATED_CHANNELS:
        const ids = extractIdsFromSelector(this.observableCollection.selector);

        return ids.map((id) => getDedicatedChannel(collectionName, id));
      default:
        throw new Meteor.Error(`Strategy could not be found: ${this.strategy}`);
    }
  }

  /**
   * @param args
   */
  async process(...args) {
    await this.processor.call(null, this.observableCollection, ...args);
  }

  /**
   * @param event
   * @param doc
   * @param modifier
   * @param modifiedTopLevelFields
   */
  async processSynthetic(event, doc, modifier, modifiedTopLevelFields) {
    await syntheticProcessor(
      this.observableCollection,
      event,
      doc,
      modifier,
      modifiedTopLevelFields
    );
  }

  /**
   * Detaches from RedisSubscriptionManager
   */
  stop() {
    try {
      RedisSubscriptionManager.detach(this);
    } catch (e) {
      console.warn(
        `[RedisSubscriber] Weird! There was an error while stopping the publication: `,
        e
      );
    }
  }

  /**
   * Retrieves the fields that are used for matching the validity of the document
   *
   * @returns {array}
   */
  getFieldsOfInterest() {
    return this.observableCollection.fieldsOfInterest;
  }
}
