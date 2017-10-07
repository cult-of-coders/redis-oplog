# Use Redis Oplog Incrementally

First, add Redis Oplog to your current setup:

```bash
meteor remove insecure
meteor add disable-oplog
meteor add cultofcoders:redis-oplog
```

Second, configure the package via Meteor's settings.json:

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
    "debug": false,                  // Will show timestamp and activity of redis-oplog.
    "overridePublishFunction": false // Will patch Meteor.publish to become Meteor.publishWithRedis
  }
}
```

Finally, run your application: 

```bash
meteor run --settings settings.json
```

Optional: [tune Redis Oplog](docs/finetuning.md).

Note: If you use any packages that initialize collections, including local ones, make sure that `cultofcoders:redis-oplog` loads before them. See the [Load Order](./load_order.md) document for more information.


# About Insecure Package

To use Redis Oplog with-in your current setup, you must remove the `insecure` package. If you are using this in your production application, you could switch to using allow/deny rules on your collections.
