## Optimistic UI (Latency Compensation)

When we perform an optimistic update, here is the timeline of the socket:

- Call of the Method
- Changes done to collections
- Ok response from method

Optimistic UI is a bit expensive in the sense that it will cause some delays to a method's return.

By default **optimistic** config is enabled. If you aren't using Optimistic UI, disabling it will lead to more performance.

You can have it by default disabled in redis initialization:
```
{
    "redisOplog": {
        "mutationDefaults": {
            "optimistic": false,
            "pushToRedis": true
        }
    }
}
```

```
// if disabled, both client and server
Meteor.methods({
    insertItem(item) {
        if (Meteor.isSimulation) {
            Items.insert("xxx");
        } else {
            Items.insert("xxx", {optimistic: true});
        }
    }
})
```

If you are using client-side inserts, not within a method, no changes are required, it's optimistic by default:
```
// client-side
Messages.insert({title: "Hello"})
```
