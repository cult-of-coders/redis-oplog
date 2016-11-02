**Work in progress. Not working. Not on atmosphere yet.**

## Usage


```
Meteor.publishWithRedis('name', function (args) {
    return Collection.find();
})
```

```
// inserting data
Messages.insert(message, {namespace: ['thread-${threadId']}

Meteor.publishRedis('chat', function (threadId) {
    return Messages.find({threadId}, {}, {namespace: 'thread-${threadId}'});
})
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
