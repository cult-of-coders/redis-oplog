Welcome to Redis Oplog
======================

### LICENSE: MIT

[![Build Status](https://api.travis-ci.org/cult-of-coders/redis-oplog.svg?branch=master)](https://travis-ci.org/cult-of-coders/redis-oplog)


## What ?

A full re-implementation of the Meteor's MongoDB oplog tailing. This time, reactivity is controlled by the app, opening a new world
into building reactive applications, highly performant chat apps, games, reactivity for non-persistent data.

Incrementally adoptable & works with your current Meteor project.

## Current Limitations

- No support for upsert
- No support for callbacks on mutations like .insert/.update/.remove

## Install

```bash
meteor add cultofcoders:redis-oplog
meteor add disable-oplog
```

## Usage

Import this before anything else server-side. This is very important.

```js
// in startup server file (ex: /imports/startup/server/redis.js)
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog';

// simple usage
RedisOplog.init() // will work with 127.0.0.1:6379, the default

// sets up the configuration parameters:
// https://github.com/luin/ioredis#connect-to-redis
RedisOplog.init({
    redis: {
        port: 6379,          // Redis port
        host: '127.0.0.1',   // Redis host
    },
    debug: false, // default is false,
    overridePublishFunction: true // replaces .publish with .publishWithRedis, leave false if you don't want to override it
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

## How it works

### Sending changes

This package will allow you to use Redis pub/sub system to trigger changes. So what we'll basically have here is a dual-write system.

We override the mutators from the Collection: `insert`, `update` and `remove` to publish the changes to redis immediately after they have been
sent to the database.

Let's take an example:
```
const Messages = new Mongo.Collection('messages')
Messages.insert({text: 'Hello'})
```

After the insert is done into the database, we will publish to Redis channel "messages" (same name as the collection name) the fact
that we did an insert, and the document we inserted.

For an update, things get a bit interesting in the back:
```
Messages.update(messageId, {
    $set: { text: 'Hello World!' }
})
```

This will publish the update event to "messages" channel in Redis but also to "messages::messageId". The reason we do this will be explored
later in this document.

If you choose to update based on a selector:
```
Messages.update({read: false}, {
    $set: {read: true}
}, {multi: true})
```

In the back it will fetch the ids (N length) that have {read: false}, it will perform the update, then it will send N messages to "messages" channel,
and another N messages to "message:messageId" channels with information regarding the update.

All the publications sent to redis are run in a fiber in the background, so it will not have impact on the. 

Removing something is almost the same concept as updates, except ofcourse the event sent is "REMOVE" instead of "UPDATE"

### Listening to changes

When you create a publication in Meteor you return a cursor or an array of cursors. For example:

```
Meteor.publishWithRedis('my_messages', function () {
    return Messages.find({userId: this.userId});
})
```

It will subscribe to the channel "messages", and all incoming events will be processed to see if it affects the query, and it will send
proper changes to the observer (the client)

We re-use publications that are the same, and redis channels that are the same. So processing is done as little as possible.

### Direct Processing

There is another special use-case for listening to changes, and it is related to cursor that are filtered by _ids. We call this "Direct Processing"

```
Meteor.publishWithRedis('items', function () {
    return Items.find({_id: {$in: ids}});
    // this has the same behavior when you have a selector like {_id: 'XXX'}
})
```

In this case we won't listen to "items" channel at all. We will, instead, listen to multiple channels:
- items::ids[0]
- items::ids[1]
- ...

Where ids[0] represents the actual _id.

This is one of the most efficient ways to catch changes and process them.

## Stopping Reactivity

We extend the mutators `insert`, `update` and `remove` to allow an extra argument. For various reasons, this why we break 
the ability to have callbacks. We believe that this isn't a big draw-back since they are not so used.

```
// no changes will be published to any redis channels
Collection.insert(document, {pushToRedis: false})
Collection.update(selector, document, {pushToRedis: false})
Collection.remove(selector, {pushToRedis: false})
```

## Fine-Tuning

### Custom Channels

You can create publications that listen to a certain channel or channels:

```js
Meteor.publishWithRedis('messages_by_thread', function (threadId) {
    // perform additional security checks here

    return Messages.find(selector, {
        channel: 'threads::' + threadId + '::messages' // you can use anny conventions that you like
    }),
})
```

Now if you insert into Messages like you are used to, you will not see any changes. Because
the default channel it will push to is "messages", but we are listening to `threads::${threadId}::messages`, so
the solution is this:

```js
Messages.insert(data, {
    channel: `threads::` + threadId + '::messages';
})
// works the same with update/remove
```

By doing this you have a very focused layer of reactivity.

Note: Even if you use channel, making a change to an _id will still push to `messages::$id`, so it will still do 2 publications to Redis.

### Namespacing

Namespacing is a concept a bit different from channels. Because it will be collection aware. And it's purpose is to enable
multi-tenant systems. For example you have multiple companies that use the same app and share the same database. You can
easily laser-focus the reactivity for them by using this concept.

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

The channel to which redis will push is: `company::${companyId}::users`.

Note: Even if you use namespace, making a change (update/remove) it will still push to `users::${id}`, to enable direct processing to work.

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

### Fallback to polling

```js
Meteor.publishWithRedis('users', function () {
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

The allowed modifiers for SyntheticMutator can be found here: https://www.npmjs.com/package/mongo-query

Warning! If your publication contains "fields" options.
```
{
    fields: { text: 1, typing: 1 }
}
```

Even if the fields don't actually exist in the db. The reason we do it like this, is to allow control over access in the synthetic events.
For some people you may want to see them, others you do not, depending on their role.

### Publish Composite

It works with [publish composite package](https://github.com/englue/meteor-publish-composite) out of the box, you just need to install it and that's it. It will use Redis as the oplog.

### Merging scenarios

https://docs.google.com/document/d/1Cx-J7xwP9IlbEa54RiT_34GK4o8M6XpPieRvNPI_aUE/edit?usp=sharing

