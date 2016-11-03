## Work in progress. 
## Not on atmosphere yet.

Thanks for understanding!

## LICENSE: MIT

## Install
(Temporary like this until it will be published to atmosphere)

```
// Inside your meteor root
mkdir -p packages
cd packages
git clone https://github.com/cult-of-coders/redis-oplog
meteor add cultofcoders:redis-oplog

// Run tests
meteor test-packages --driver-package practicalmeteor:mocha packages/redis-oplog

// Current tests unreliable, they only work the first time, because of database fixtures
```

## Usage

```
// in startup server file (ex: /imports/startup/server/redis.js
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog';

// simple usage
RedisOplog.init() // will work with 127.0.0.1:6379, the default

// sets up the configuration parameters 
// https://github.com/luin/ioredis#connect-to-redis
// you can use Meteor.settings here as well.
RedisOplog.init({
    redis: {
        port: 6379,          // Redis port
        host: '127.0.0.1',   // Redis host
    }
});
```

```
Meteor.publishWithRedis('name', function (args) {
    return Collection.find(selector, options);
    // you can also return an array of cursors
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

```
// By default, the namespace for:
const Messages = new Mongo.Collection('messages');
// is 'messages'

// Updates & Removes make 2 publishes for each namespace.
messages & messages::{updatedOrRemovedId}
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
