Welcome to Redis Oplog
======================

### LICENSE: MIT

[![Build Status](https://api.travis-ci.org/cult-of-coders/redis-oplog.svg?branch=master)](https://travis-ci.org/cult-of-coders/redis-oplog)

## RedisOplog

A full re-implementation of the Meteor's MongoDB oplog tailing. This time, reactivity is controlled by the app, opening a new world
into building reactive applications, highly scalable chat apps, games, and added reactivity for non-persistent data.

Incrementally adoptable & works with your current Meteor project.

## Installation

```bash
meteor add cultofcoders:redis-oplog
meteor add disable-oplog
```

Configure it via meteor settings:

```
// settings.json these are the defaults
{
  ...
  "redisOplog": {
    "redis": {
        // all the options available can be found here: https://github.com/NodeRedis/node_redis#options-object-properties
      "port": 6379,          // Redis port
      "host": "127.0.0.1"   // Redis host
    },
    "mutationDefaults": {
        "optimistic": false, // Does not to a sync processing on the diffs
        "pushToRedis": true // Pushes to redis the changes
    }
    "debug": false, // Will show timestamp and activity of redis-oplog.
    "overridePublishFunction": true // Meteor.publish becomes Meteor.publishWithRedis, set to false if you don't want to override it
  }
}
```

```
// or simpler it will apply the defaults above
{
    ...
    "redisOplog": {}
}
```

```bash
meteor run --settings settings.json
```

Make sure that if you use packages that initialize collections, even local ones, *cultofcoders:redis-oplog* needs to be loaded before them.

You also have the ability to load them in JavaScript. The rule here is to do it, before anything else:
```
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog'
RedisOplog.init(config);
```

## Notes

RedisOplog does not work with *insecure* package. Remove it and specify *allow* or *deny* for each collection. Thank you!

RedisOplog is fully backwards compatible, so there won't be any change in how you use Meteor, unless you want to fine-tune your application for absolute performance.


## Redis Unavailability

If redis server fails, it will `console.error` this fact, and it will keep retrying to connect every 30 seconds. Once connection is resumed
reactivity will be resumed. However, changes that happened while Redis was down will not be visible. In future we will treat this scenario.

## Stats

If you are interested in viewing how many observers are registered or memory consumption:
```
meteor shell
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog';

// works only server-side
RedisOplog.stats()
```

### [Optimistic UI](docs/optimistic_ui.md)

If you are using optimistic ui in your application, you should give this a read.

### [How It Works](docs/how_it_works.md)

Find out what RedisOplog does behind the scenes

### [Fine Tuning](docs/finetuning.md)

Find out how you can use the advantages of RedisOplog to make your app very performant.

