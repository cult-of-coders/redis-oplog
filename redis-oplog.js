import "./lib/mongo//mongoCollectionNames";

import { RedisPipe, Events } from "./lib/constants";
import { Meteor } from "meteor/meteor";
import init from "./lib/init";
import Config from "./lib/config";
import { getRedisListener, getRedisPusher } from "./lib/redis/getRedisClient";
import SyntheticMutator from "./lib/mongo/SyntheticMutator";
import ObservableCollection from "./lib/cache/ObservableCollection";
import Vent from "./lib/vent/Vent";

const RedisOplog = {
  init,
};

// Warnings
Meteor.startup(function () {
  if (Package["insecure"]) {
    console.log("RedisOplog does not support the insecure package.");
  }
});

export {
  RedisOplog,
  SyntheticMutator,
  ObservableCollection,
  RedisPipe,
  Config,
  Events,
  Vent,
  getRedisListener,
  getRedisPusher,
};

if (process.env.REDIS_OPLOG_SETTINGS) {
  init(JSON.parse(process.env.REDIS_OPLOG_SETTINGS));
} else if (Meteor.settings.redisOplog) {
  init(Meteor.settings.redisOplog);
}
