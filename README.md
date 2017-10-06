Redis Oplog for Meteor
======================

**Redis Oplog is complete re-implementation of LiveQuery (commonly referred to as  oplog tailing).** Redis Oplog enables your application to control it's reactive queries through Redis - rather than just respond to MongoDB's operation logs. It opens a new world into building fast, scalable, and reactive applications.

**Redis Oplog is backwards compatible with LiveQuery**, so there won't be any change in how you use Meteor. It also enables you to fine-tune your reactive queries to achieve absolute performance. Finally, Redis Oplog is incrementally adoptable and should work flawlessly with your current setup.

**Redis Oplog is intended for applications that are scaling to 1000 concurrent clients and beyond.** However, it can also be beneficial for smaller applications, as it could trim CPU usage and save you hosting expenses.

To summarize, Redis Oplog helps you: 
 - scale Meteor's reactive queries horizontally
 - control your reactive queries performance
 - save costs by lowering CPU usage 
 
## How to Use

First, integrate Redis Oplog into your app:

```bash
meteor remove insecure
meteor add disable-oplog
meteor add cultofcoders:redis-oplog
```

Second, configure the package via settings.json:

```javascript
{
  ...
  "redisOplog": {
    "redis": {
      "port": 6379,
      "host": "127.0.0.1"
    },
    "mutationDefaults": {
        "optimistic": false, // Does not to a sync processing on the diffs
        "pushToRedis": true  // Pushes to Redis the changes
    }
    "debug": false,                 // Will show timestamp and activity of redis-oplog.
    "overridePublishFunction": true // Will patch Meteor.publish to become Meteor.publishWithRedis
  }
}
```

Finally, run your application: 

```bash
meteor run --settings settings.json
```

Note: If you use any packages that initialize collections, including local ones, make sure that `cultofcoders:redis-oplog` loads first. See the [Load Order](docs/load_order.md) document for more information.

## Further Reading

- [How It Works](docs/how_it_works.md)<br>
  Find out what Redis Oplog does behind the scenes

- [Incremental Adoption](docs/incremental_adoption.md)<br>
  Learn how to use Redis Oplog alongside LiveQuery

- [Optimistic UI](docs/optimistic_ui.md)<br>
  Learn how Redis Oplog works with Optimistic UI

- [Fine Tuning](docs/finetuning.md)<br>
  Find out how you can tune Redis Oplog to optimize your app performance

- [Monitoring](docs/stats.md)<br>
See how much memory is being used and how many observers are registered

- [Redis Unavailability](docs/redis_unavailability.md)<br>
Learn how Redis Oplog works if/when Redis becomes unavailable

- [Package Load Order](docs/load_order.md) <br>
Helpful for ensuring Redis Oplog runs smoothly

- <a href="https://github.com/NodeRedis/node_redis#options-object-properties">node_redis Documentation</a><br>
Redis Oplog uses the node_redis NPM package to interact with Redis. For more options on configuration, refer to the package documentation