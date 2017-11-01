## Optimistic UI (Latency Compensation)

When we perform an optimistic update, here is the timeline of the socket:

- Call of the Method
- Changes done to collections
- Ok response from method

Optimistic UI is a bit expensive in the sense that it will cause some delays to a method's return.
By default **optimistic** config is disabled, meaning if you have a method that is both on client and server, it will not work accordingly unless
you pass the option ```{optimistic: true}```

You can have it by default enabled in redis initialization:
```
{
    "redisOplog": {
        "mutationDefaults": {
            "optimistic": true,
            "pushToRedis": true
        }
    }
}
```

```
// both client and server
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

If you are using client-side inserts, not within a method, no changes are required.
```
// client-side
Messages.insert({title: "Hello"})
```
