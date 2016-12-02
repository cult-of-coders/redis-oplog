Welcome to Redis Oplog
======================

[![Build Status](https://api.travis-ci.org/cult-of-coders/redis-oplog.svg?branch=master)](https://travis-ci.org/cult-of-coders/redis-oplog)

## What ?

A full re-implementation of the Meteor's MongoDB oplog tailing. This time, reactivity is controlled by the app, opening a new world
into building reactive applications, highly performant chat apps, games, reactivity for non-persistent data.

Incrementally adoptable & works with your current Meteor project.

## Current Limitations

- No support for upsert
- No support for callbacks on mutations like .insert/.update/.remove
- Not reliable to display the correct sort when new changes come in, and the sort options are not present in the fields. Because we do not make use of observe-sequence, so addedAt, movedAt, etc will not be called.
- Does not work with "null" publications

## Install

```bash
meteor add cultofcoders:redis-oplog
meteor add disable-oplog
```

## Usage

Import this before anything else server-side.

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

## Basic Usage

```js
// or Meteor.publish if you chose overridePublishFunction as true

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

// upsert not supported for reactivity
```

## Stopping Reactivity

We extend the mutators `insert`, `update` and `remove` to allow an extra argument. (Note: if you use callbacks it will still work if you put these options after the callback)

```
// inserting data without reactivity
Messages.insert(message, {pushToRedis: false})
Messages.update(_id, message, {pushToRedis: false})
Messages.remove(_id, {pushToRedis: false})
```

## Fine-Tuning

We introduce several concepts when it comes to making live-data truly scalable.
By default when you do insert and update, depending on the collection's name, we push
to `collectionName` channel in redis and also to `collectionName::_id` for _id represents
the affected document.

### Direct Processing

If you return a cursor, or an array of cursors, that have as filters `_id` or `_id: {$in: ids}` then it overrides
everything and will only listen to changes for those separate channels only. This will be very performant.

WARNING!

Direct processing overrides any custom channels or namespaces that you specify. Because it is the most efficient type of query-ing
by listening to separate channels like "collection::{id}"

### Custom Channels

You can create publications that listen to a certain channel or channels:
```js
Meteor.publishWithRedis('messages_by_thread', function (threadId) {
    // perform additional security checks here

    return Messages.find(selector, {
        channel: 'threads::' + threadId + '::messages';
    }),
})

// you can use any string convetion you like for naming your channels.
```

Now if you insert into Messages like you are used to, you will not see any changes. Because
the default channel it will push to is 'messages', but we are listening to `threads::${threadId}::messages`, so
the solution is this:

```js
Messages.insert(data, {
    channel: `threads::` + threadId + '::messages';
})
// works the same with update/remove
```

By doing this you have a very specific layer of reactivity.

Note: Even if you use channel, making a change to an _id will still push to `messages::$id`

### Namespacing

Namespacing is a concept a bit different from channels. Because it will be collection aware. And it's purpose is to enable
multi-tenant systems.

```js
Meteor.publishWithRedis('users', function () {
    // get the company for this.userId

    return Users.find({companyId}, {namespace: 'company::' + companyId})
})
```

```js
Users.insert(data, {
    namespace: companyId
})
```

The channel to which redis will push is: `users::${companyId}`.

Note: Even if you use namespace, making a change (update/remove) to an _id will still push to `users::${id}`

### Allowed Options For Cursors

```js
{
    channel: '' // it will only listen to this channel
    channels: [] // array of strings, it will listen to those
    namespace: 'namespaceString' // it will listen to namespaceString::collectionName
    namespaces: [] // same as above
    protectFromRaceCondition: true // by default this is false, if you have super-critical data, it's best that you set this to true, the cost for this lies in extra DB + Network traffic to always fetch the updated fields from the db
}
```

### Allowed Options For Mutations

```
{
    channel: '' // will only reach the cursors that listen to this channel
    channels: [] // will reach all cursors that listen to any of these channels
    namespace: '' 
    namespaces: [] 
    pushToRedis: true // default is true, use false if you don't want reactivity at all. Useful when doing large batch inserts/updates.
}
```

`channel`, `channels`, `namespace`, `namespaces` are also allowed as options when you return a cursor.

### Fallback to polling

If you chosen to override the default behavior "publish"
```js
Meteor.publish('users', function () {
    // get the company for this.userId

    return Users.find({
        companyId
    }, {
        disableOplog: true,
        pollingIntervalMs: 20000 // poll every 20s
    })
})
```

### Synthetic Mutation

This is to emulate a write to the database that you don't actually need persisted. Basically,
your publication would behave as if an actual update happened in the database.

You will use this for showing live things that happen, things that you don't want saved.

For example you have a chat, and you want to transmit to the other user that he is typing his message.
The limit of using synthetic mutations is bound only to your imagination, it enables reactivity for non-persistent data.

```js
import { SyntheticMutator } from 'meteor/cultofcoders:redis-oplog';

SyntheticMutator.update(channelString, messageId, {
    someField: {
        deepMerging: 'willHappen'
    }
})

// added support for mongo operators
SyntheticMutator.update(channelString, messageId, {
    $push: {
        someField: someValue
    }
})

SyntheticMutator.insert(channel, data);
SyntheticMutator.remove(channel, _id);
```

Warning! If your publication contains "fields" options.
```
{
    fields: { text: 1, typing: 1 }
}
```

Even if the fields don't actually exist in the db. The reason we do it like this, is to allow control over access in the synthetic events.
For some people you may want to see them, others you do not, depending on their role.

## Publish Composite

It works with [publish composite package](https://github.com/englue/meteor-publish-composite) out of the box, you just need to install it and that's it. It will use Redis as the oplog.

## Merging scenarios

https://docs.google.com/document/d/1Cx-J7xwP9IlbEa54RiT_34GK4o8M6XpPieRvNPI_aUE/edit?usp=sharing

## LICENSE: MIT
