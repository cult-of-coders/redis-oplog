Welcome to Redis Oplog
======================

[![Build Status](https://api.travis-ci.org/cult-of-coders/redis-oplog.svg?branch=master)](https://travis-ci.org/cult-of-coders/redis-oplog)


## What ?

A full re-implementation of the Meteor's MongoDB oplog tailing. This time, reactivity is controlled by the app, opening a new world
into building reactive applications, highly performant chat apps, games, reactivity for non-persistent data.

## Install

```bash
meteor add cultofcoders:redis-oplog
```

## Usage

```js
// in startup server file (ex: /imports/startup/server/redis.js)
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
    },
    debug: false, // default is false,
    overridePublishFunction: false // if true, replaces .publish with .publishWithRedis
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

// remove & update. this will send an additional message to redis channel "messages::${id}"

// Does not offer support for upsert yet. You can do upsert, but it will not trigger reactivity with Redis.
// Not hard to implement, but not the main focus right now

// inserting data without reactivity
Messages.insert(message, {pushToRedis: false})
Messages.update(_id, message, {pushToRedis: false})
Messages.remove(_id, {pushToRedis: false})

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

### Synthetic Mutation

This is to emulate a write to the database that you don't actually need persisted. For example you have a chat, and you want
to transmit to the other user that he is typing, or you are dragging something and you want the other user to see the dragging
happening live.

```
import { SyntheticMutation } from 'meteor/cultofcoders:redis-oplog';

SyntheticMutation(channel).update(messageId, {
    someField: {
        deepMerging: 'willHappen'
    }
})

SyntheticMutation(channel).remove(_id);
SyntheticMutation(channel).insert(dataWithId);

// works with Mongo.Collection instances
SyntheticMutation(MongoCollectionInstance)

// if you fine-tuned the reactivity for example and you listen to message son a thread

SyntheticMutation(`thread.${threadId}`).update(_id, {
    typing: {
        [userId]: true
    }
});
```

Warning! If your publication contains "fields" options. It must contain:
```
{
    fields: { text: 1, typing: 1 }
}
```

Even if the fields don't actually exist in the db. The reason we do it like this, is to allow control over access in the synthetic events.
For some people you may want to see them, others you do not, depending on their role.

## Merging scenarios:

https://docs.google.com/document/d/1Cx-J7xwP9IlbEa54RiT_34GK4o8M6XpPieRvNPI_aUE/edit?usp=sharing

## LICENSE: MIT