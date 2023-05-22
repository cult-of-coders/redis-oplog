## Outside Mutations

There may be scenarios where you have an external service that is not Meteor, which
performs mutations to MongoDB. If you want your subscriptions to "catch" the changes you have to send 
manually the changes to redis channels.

However, this is pretty straight forward.

Given I have the following publication:
```js
return Tasks.find({groupId});
```

If an outside worker updates the MongoDB, it should also send changes to redis like this:

```js
// update task document, that changes status inside MongoDB
redis.publish('tasks', JSON.stringify({
    e: 'u',
    d: {_id: taskId},
    f: ['status']
}))
```

`tasks` represents the name of the collection inside MongoDB and the message is a JSON string that can be parsed by the query processors.

These constants are described inside `RedisPipe` and `Events` [here](../lib/constants.js)

If you plan on using this I suggest you copy it to your own constants, transforming the code like this:

```js
redis.publish('tasks', JSON.stringify({
   [RedisPipe.EVENT]: Events.UPDATE,
   [RedisPipe.DOC]: {_id: taskId},
   [RedisPipe.FIELDS]: ['status']
}))
```

You have to be careful, if in your app you subscribe by `_id`:
```js
return Tasks.find({_id: taskId})
```

In order for the processor to catch the event you have to send it to the `tasks::taskId` channel, where `taskId` represents the actual id inside MongoDB.

So, if you have both types of publications, you have to publish it to both `tasks` and `tasks::taskId` channels inside redis.

If you use namespaces, the channels also change:
```js
return Tasks.find({groupId}, {
    namespace: `group::${groupId}`
})
```

This type of query will listen to `group::groupId::tasks`, this means that if you want to trigger reactivity for this query,
you have to send it to both `group::groupId::tasks` and `tasks::taskId`, where `groupId` and `taskId` represent the actual ids inside MongoDB.

Keep in mind, that namespaces don't affect direct query processing:
```js
return Tasks.find({_id: taskId}, {
    namespace: `group::${groupId}`
})
```

This type of subscription will bypass namespacing, and listen to only `task::taskId`

You can also trigger inserts and removes.
The same rules for namespacing and direct processing applies.

```js
redis.publish('tasks', JSON.stringify({
  [RedisPipe.EVENT]: Events.INSERT,
  [RedisPipe.DOC]: {_id: taskId},
}))
```

```js
redis.publish('tasks', JSON.stringify({
  [RedisPipe.EVENT]: Events.REMOVE,
  [RedisPipe.DOC]: {_id: taskId},
}))
```

If you are using `.rawCollection()` to perform some MongoDB specific operations, then you have to manually push things to Redis,
using the same strategies specified above:

```js
import {getRedisPusher, Events, RedisPipe} from 'meteor/cultofcoders:redis-oplog';

getRedisPusher().publish('tasks', EJSON.stringify({
    [RedisPipe.DOC]: {_id: taskId},
    [RedisPipe.EVENT]: Events.UPDATE,
    [RedisPipe.FIELDS]: ['status']
}));
```

