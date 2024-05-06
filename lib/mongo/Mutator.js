import { Meteor } from "meteor/meteor";
import { _ } from "meteor/underscore";
import getMutationConfig from "./lib/getMutationConfig";
import getFields from "../utils/getFields";
import {
  dispatchInsert,
  dispatchUpdate,
  dispatchRemove,
} from "./lib/dispatchers";
import Config from "../config";
import { Events } from "../constants";

function runCallbackInBackground(fn) {
  Meteor.defer(Meteor.bindEnvironment(fn));
}

function protectAgainstRaceConditions(collection) {
  if (!collection._redisOplog) {
    return true;
  }

  return (
    collection._redisOplog &&
    collection._redisOplog.protectAgainstRaceConditions
  );
}

function shouldIncludePrevDocument(collection) {
  return (
    collection._redisOplog && collection._redisOplog.shouldIncludePrevDocument
  );
}

/**
 * The Mutator is the interface that does the required updates
 */
export default class Mutator {
  static init() {
    Mutator.passConfigDown = Config.passConfigDown;

    // regardless of your choice, these 2 packages must passConfigDown
    // we do like this until we find a more elegant way
    if (
      Package["aldeed:collection2"] !== undefined ||
      Package["aldeed:collection2-core"] !== undefined
    ) {
      Mutator.passConfigDown = true;
    }
  }

  static async insert(Originals, data, _config) {
    const config = await getMutationConfig(this, _config, {
      doc: data,
      event: Events.INSERT,
    });

    if (canUseOriginalMethod(config)) {
      return Originals.insert.call(
        this,
        data,
        _.isFunction(_config) ? _config : undefined
      );
    }

    try {
      const docId = await Originals.insert.call(this, data);

      // It's a callback
      if (_.isFunction(_config)) {
        const self = this;
        runCallbackInBackground(function () {
          _config.call(self, null, docId);
        });
      }

      let doc = { _id: docId };

      if (!protectAgainstRaceConditions(this)) {
        doc = await Originals.findOne.call(this, docId);
      }

      await dispatchInsert(
        config.optimistic,
        this._name,
        config._channels,
        doc
      );

      return docId;
    } catch (e) {
      if (_.isFunction(_config)) {
        Meteor.defer(() => {
          return _config.call(this, e);
        });
      } else {
        throw e;
      }
    }
  }

  /**
   * @param Originals
   * @param selector
   * @param modifier
   * @param _config
   * @param callback
   * @returns {*}
   */
  static async update(Originals, selector, modifier, _config, callback) {
    if (_.isString(selector)) {
      selector = { _id: selector };
    }

    if (_.isFunction(_config)) {
      callback = _config;
      _config = {};
    }

    const config = await getMutationConfig(this, _config, {
      event: Events.UPDATE,
      selector,
      modifier,
    });

    if (canUseOriginalMethod(config)) {
      return Originals.update.call(this, selector, modifier, _config, callback);
    }

    // searching the elements that will get updated by id
    const findOptions = { fields: { _id: 1 }, transform: null };
    if (!config.multi) {
      findOptions.limit = 1;
    }

    let docs;
    if (shouldIncludePrevDocument(this)) {
      docs = await this.find(selector, {
        ...findOptions,
        fields: {},
      }).fetchAsync();
    } else {
      docs = await this.find(selector, findOptions).fetchAsync();
    }

    let docIds = docs.map((doc) => doc._id);

    if (config && config.upsert) {
      return Mutator._handleUpsert.call(
        this,
        Originals,
        selector,
        modifier,
        Object.assign({}, { _returnObject: false }, config),
        callback,
        docIds,
        docs
      );
    }

    // we do this because when we send to redis
    // we need the exact _ids
    // and we extend the selector, because if between finding the docIds and updating
    // another matching insert sneaked in, it's update will not be pushed
    const updateSelector = Object.assign({}, selector, {
      _id: { $in: docIds },
    });

    try {
      const result = await Originals.update.call(
        this,
        updateSelector,
        modifier,
        config
      );

      // phony callback emulation
      if (callback) {
        const self = this;
        runCallbackInBackground(function () {
          callback.call(self, null, result);
        });
      }

      if (!protectAgainstRaceConditions(this)) {
        docs = await this.find(
          { _id: { $in: docIds } },
          {
            ...findOptions,
            fields: {},
          }
        ).fetchAsync();
      }

      const { fields } = getFields(modifier);

      await dispatchUpdate(
        config.optimistic,
        this._name,
        config._channels,
        docs,
        fields
      );

      return result;
    } catch (e) {
      if (callback) {
        const self = this;
        runCallbackInBackground(function () {
          callback.call(self, e);
        });
      } else {
        throw e;
      }
    }
  }

  /**
   * @param Originals
   * @param selector
   * @param modifier
   * @param config
   * @param callback
   * @param docIds
   */
  static async _handleUpsert(
    Originals,
    selector,
    modifier,
    config,
    callback,
    docIds,
    docs
  ) {
    try {
      const data = await Originals.update.call(
        this,
        selector,
        modifier,
        Object.assign({}, config, { _returnObject: true })
      );

      if (callback) {
        const self = this;
        runCallbackInBackground(function () {
          callback.call(this, null, data);
        });
      }

      if (config.pushToRedis) {
        if (data.insertedId) {
          let doc = {
            _id: data.insertedId,
          };

          if (!protectAgainstRaceConditions(this)) {
            doc = await this.findOneAsync(doc._id);
          }

          await dispatchInsert(
            config.optimistic,
            this._name,
            config._channels,
            doc
          );
        } else {
          // it means that we ran an upsert thinking there will be no docs
          if (docIds.length === 0 || data.numberAffected !== docIds.length) {
            // there were no docs initially found matching the selector
            // however a document sneeked in, resulting in a race-condition
            // and if we look again for that document, we cannot retrieve it.

            // or a new document was added/modified to match selector before the actual update
            console.warn(
              "RedisOplog - Warning - A race condition occurred when running upsert."
            );
          } else {
            const { fields } = getFields(modifier);

            docs = await this.find(selector).fetchAsync();

            await dispatchUpdate(
              config.optimistic,
              this._name,
              config._channels,
              docs,
              fields
            );
          }
        }
      }

      if (config._returnObject) {
        return data;
      } else {
        return data.numberAffected;
      }
    } catch (e) {
      if (callback) {
        const self = this;
        runCallbackInBackground(function () {
          callback.call(self, e);
        });
      } else {
        throw e;
      }
    }
  }

  /**
   * @param Originals
   * @param selector
   * @param _config
   * @returns {*}
   */
  static async remove(Originals, selector, _config) {
    selector = Mongo.Collection._rewriteSelector(selector);

    const config = await getMutationConfig(this, _config, {
      selector,
      event: Events.REMOVE,
    });

    if (canUseOriginalMethod(config)) {
      return Originals.remove.call(
        this,
        selector,
        _.isFunction(_config) ? _config : undefined
      );
    }

    const removeSelector = Object.assign({}, selector);
    const removeOptions = {
      fields: { _id: 1 },
      transform: null,
    };

    if (shouldIncludePrevDocument(this)) {
      delete removeOptions.fields;
      delete removeOptions.projection;
    }

    // TODO: optimization check if it has _id or _id with {$in} so we don't have to redo this.
    const docs = await this.find(selector, removeOptions).fetchAsync();
    let docIds = docs.map((doc) => doc._id);

    if (!selector._id) {
      removeSelector._id = { $in: docIds };
    }

    try {
      const result = await Originals.remove.call(this, removeSelector);

      if (_.isFunction(_config)) {
        const self = this;
        runCallbackInBackground(function () {
          _config.call(self, null, result);
        });
      }

      await dispatchRemove(
        config.optimistic,
        this._name,
        config._channels,
        docs
      );

      return result;
    } catch (e) {
      if (_.isFunction(_config)) {
        const self = this;
        runCallbackInBackground(function () {
          _config.call(self, e);
        });
      } else {
        throw e;
      }
    }
  }
}

function canUseOriginalMethod(mutationConfig) {
  // There are two cases where we can use the original mutators rather than
  // our overriden ones:
  //
  // 1) The user set pushToRedis: false, indicating they don't need realtime
  //    updates at all.
  //
  // 2) The user is using an external redis publisher, so we don't need to
  //    figure out what to publish to redis, and this update doesn't need
  //    optimistic-ui processing, so we don't need to synchronously run
  //    observers.
  return (
    !mutationConfig.pushToRedis ||
    (Config.externalRedisPublisher && !mutationConfig.optimistic)
  );
}
