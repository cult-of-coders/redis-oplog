## Introducing BlueLibs

- [GitHub BlueLibs Monorepo](https://github.com/bluelibs/bluelibs)
- Following the same bold vision of Meteor, but with a modern twist. www.bluelibs.com
- Read more about our approach coming from Meteor: https://www.bluelibs.com/blog/2021/11/26/the-meteor-of-2022
- We've implemented [RedisOplog](https://www.bluelibs.com/docs/package-x-bundle#live-data) in our framework as well, but it also works with in-memory and with customisable pubsub, not bound to redis.

# Welcome to Redis Oplog

### LICENSE: MIT

[![Backers on Open Collective](https://opencollective.com/redis-oplog/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/redis-oplog/sponsors/badge.svg)](#sponsors)

## RedisOplog

A full re-implementation of the Meteor's MongoDB oplog tailing. This time, reactivity is controlled by the app, opening a new world
into building reactive applications, highly scalable chat apps, games, and added reactivity for non-persistent data.

Incrementally adoptable & works with your current Meteor project.

## Installation

```bash
meteor add cultofcoders:redis-oplog
meteor add disable-oplog
```

Configure it via Meteor settings:

```
// settings.json
{
    ...
    "redisOplog": {}
}

// default full configuration
{
  ...
  "redisOplog": {
    "redis": {
      "port": 6379, // Redis port
      "host": "127.0.0.1" // Redis host
    },
    "retryIntervalMs": 10000, // Retries in 10 seconds to reconnect to redis if the connection failed
    "mutationDefaults": {
        "optimistic": true, // Does not do a sync processing on the diffs. But it works by default with client-side mutations.
        "pushToRedis": true // Pushes to redis the changes by default
    },
    "debug": false, // Will show timestamp and activity of redis-oplog.
  }
}
```

To see what you can configure under `"redis": {}` take a look here:
https://www.npmjs.com/package/redis#options-object-properties

```bash
meteor run --settings settings.json
```

## Notes

RedisOplog is fully backwards compatible, so there won't be any change in how you use Meteor, unless you want to fine-tune your application for absolute performance.

To make sure it is compatible with other packages which extend the `Mongo.Collection` methods, make sure you go to `.meteor/packages`
and put `cultofcoders:redis-oplog` as the first option.

RedisOplog does not work with _insecure_ package, which is used for bootstrapping your app.

## Stats

If you are interested in viewing how many observers are registered or memory consumption:

```
meteor shell
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog';

// works only server-side
RedisOplog.stats()
```

### The levels of scaling reactivity

1.  Just add RedisOplog, you will already see big performance improvements
2.  Fine-tune your reactivity by using custom namespaces and channels
3.  Implement your own custom reactivity by using Redis Vent

### Events for Meteor (+ Redis Oplog, Grapher and GraphQL/Apollo)

- Meteor Night 2018 Slide: [Arguments for Meteor](https://drive.google.com/file/d/1Tx9vO-XezO3DI2uAYalXPvhJ-Avqc4-q/view) - Theodor Diaconu, CEO of Cult of Coders: “Redis Oplog, Grapher, and Apollo Live.

### [Optimistic UI](docs/optimistic_ui.md)

If you are using Optimistic UI (Latency Compensation) in your application, you should give this a read.

### [How It Works](docs/how_it_works.md)

Find out what RedisOplog does behind the scenes

### [Fine Tuning](docs/finetuning.md)

Find out how you can use the advantages of Redis Oplog to make your app very performant.

### [Redis Failover](docs/failover.md)

Find out how you can hook into redis events to customize, when it fails.

### [Redis Vent](docs/vent.md)

Find out how you can customize your reactivity and enable it across multiple languages/microservices with ease.

### [Outside Mutations](docs/outside_mutations.md)

If you have different workers/services that perform updates to mongo and they exist outside Meteor, you can still trigger
reactivity for the Meteor instances with a few lines of code.

## Premium Support

If you are looking to scale your business using this package and you need to have your back covered. We are here to help. Feel free to contact us
at contact@cultofcoders.com.

## Contributors

This project exists thanks to all the people who contribute. [[Contribute]](CONTRIBUTING.md).
<a href="graphs/contributors"><img src="https://opencollective.com/redis-oplog/contributors.svg?width=890" /></a>

## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/redis-oplog#backer)]

<a href="https://opencollective.com/redis-oplog#backers" target="_blank"><img src="https://opencollective.com/redis-oplog/backers.svg?width=890"></a>

## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/redis-oplog#sponsor)]

<a href="https://opencollective.com/redis-oplog/sponsor/0/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/redis-oplog/sponsor/1/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/redis-oplog/sponsor/2/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/redis-oplog/sponsor/3/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/redis-oplog/sponsor/4/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/redis-oplog/sponsor/5/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/redis-oplog/sponsor/6/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/redis-oplog/sponsor/7/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/redis-oplog/sponsor/8/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/redis-oplog/sponsor/9/website" target="_blank"><img src="https://opencollective.com/redis-oplog/sponsor/9/avatar.svg"></a>
