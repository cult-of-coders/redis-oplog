## Work in progress. 
## Not on atmosphere yet.

Thanks for understanding!

## LICENSE: MIT

## Install
(Temporary like this until it will be published to atmosphere)

```bash
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

```js
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

```js
Meteor.publishWithRedis('name', function (args) {
    return Collection.find(selector, options);
    // you can also return an array of cursors
})
```

```js
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

// remove & update. this will send an additional message to redis channel "messages::${id}"

// inserting data in a certain namespace(s)
Meteor.publishWithRedis('name', function (args) {
    return Collection.find(selector, options);
}) // will only listen for changes in that namespace.
```

## Fine-Tuning

We introduce several concepts when it comes to making live-data truly scalable.

### Direct Processing

First concept is direct listening. If you return a cursor, or an array of cursors,
that have as filters `_id` or `_id: {$in: ids}` then it overrides everything and will only
listen to changes for those separate channels only. This is the most performant you can get.

### Custom Channels

You can create publications that listen to a certain channel or channels:
```js
Meteor.publishWithRedis('messages_by_thread', function (threadId) {
    // perform additional security checks here
    
    return {
        cursor: Messages.find(selector, options),
        channel: `thread.${threadId}`
    }
})
```

Now if you insert into Messages like you are used to, you will not see any changes, however you need to do:
```js
Messages.insert(data, {
    channel: `thread.` + threadId
})
```

By doing this you have a very specific layer of reactivity.

The channel to which redis will push is: `thread.$threadId`

Note: Even if you use channel, making a change to an _id will still push to `messages::$id`

### Namespacing

Did I lose you yet ?

Namespacing is a concept a bit different from channels. Because it will be collection aware. And it's purpose is to enable
multi-tenant systems. Let's dive into an example:

```js
Meteor.publishWithRedis('users', function () {
    // get the company for this.userId
    
    return {
        cursor: Users.findByCompany(companyId),
        namespace: companyId
    }
})
```

You would still have to be careful when you do inserts:
```js
Messages.insert(data, {
    namespace: companyId
})
```

How is it different than channels ? And why did we separate these concepts ?

Channel represents something unique. Namespace is something more broad.

The channel to which redis will push is: `$companyId::messages`. Because messages is the name of the collection.

Note: Even if you use namespace, making a change to an _id will still push to `messages::$id`

### Advanced

Multiple namespaces and channels and cursors.

You can use multiple namespaces and channels when you do insert, and even when you return a publication, 
and this even works with multiple cursors!

Instead of namespace, use namespaces and provide array of strings. Same applies to channel, on insert and on publication return.

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

```js
Message.insert(doc, cb, {
    namespace: 'thread-id'
})
```

## Resources:
- 
- https://github.com/matb33/meteor-collection-hooks/blob/master/collection-hooks.js#L198

## Merging scenarios:

https://docs.google.com/document/d/1Cx-J7xwP9IlbEa54RiT_34GK4o8M6XpPieRvNPI_aUE/edit?usp=sharing
