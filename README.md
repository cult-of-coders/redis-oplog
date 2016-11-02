## Work in progress. 
## Not working.
## Not ready for testing
## Not on atmosphere yet

Thanks for understanding!

## Usage


```
Meteor.publishWithRedis('name', function (args) {
    return Collection.find(selector, options);
})
```

```
// inserting data the same way you are used to
Messages.insert(message)
Messages.update(_id, message)
Messages.remove(_id)

// Does not offer support for upsert yet. You can do upsert, but it will not trigger reactivity with Redis.
// Not hard to implement, but not the main focus right now

// inserting data without reactivity
Messages.insert(message, {pushToRedis: false})
Messages.update(_id, message, {pushToRedis: false})
Messages.remove(_id, {pushToRedis: false})

// inserting data in a certain namespace(s)
Meteor.publishWithRedis('name', function (args) {
    return Collection.find(selector, options);
}, {namespace}) // will only listen for changes in that namespace.

Messages.insert(message, {namespace: ['xxx']})
Messages.update(_id, message, {namespace: 'xxx'})
Messages.remove(_id, {namespace: ['xxx', 'yyy']})
```

## What ?

This is a replacement for MongoDB's oplog with Pub/Sub Redis.

## Why ?

Reactivity will be triggered by a mutation, something that happens in the app.
This enables ability to fine-tune the level of reactivity and we can even disable it, if we want to make updates in large-batches,
like migrations or something that does not require reactivity.

Other mutations outside the app can still trigger reactivity as long as they communicate with Redis. Will offer documentation and support for that.

This will also give you the ability to make any database, data-source reactive, by applying similar principles.

## Data Flow:

- Insert/Update/Remove => publish to Redis "collectionName::*"
- Publications subscribe to "collectionName::*" and process changes for the client
- We will also have dedicated channels for publications that filter by _id "collectionName::_id"
- Additional support for reactivity namespacing, that can enable creating a chat app in Meteor like:

```
Message.insert(doc, cb, {
    namespace: 'thread-id'
})

```

## Resources:
- 
- https://github.com/matb33/meteor-collection-hooks/blob/master/collection-hooks.js#L198

## Merging scenarios:

https://docs.google.com/document/d/1Cx-J7xwP9IlbEa54RiT_34GK4o8M6XpPieRvNPI_aUE/edit?usp=sharing
