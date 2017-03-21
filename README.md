Welcome to Redis Oplog
======================

### LICENSE: MIT

[![Build Status](https://api.travis-ci.org/cult-of-coders/redis-oplog.svg?branch=master)](https://travis-ci.org/cult-of-coders/redis-oplog)


## What ?

A full re-implementation of the Meteor's MongoDB oplog tailing. This time, reactivity is controlled by the app, opening a new world
into building reactive applications, highly scalable chat apps, games, and added reactivity for non-persistent data.

Incrementally adoptable & works with your current Meteor project.

## Install

```bash
meteor add cultofcoders:redis-oplog
meteor add disable-oplog
```

## Usage

Configure it via meteor settings:

```
// settings.json these are the defaults
{
  ...
  "redisOplog": {
    "redis": {
        // all the options available can be found here: https://github.com/NodeRedis/node_redis#options-object-properties
      "port": 6379,          // Redis port
      "host": "127.0.0.1"   // Redis host
    },
    "mutationDefaults": {
        "optimistic": false, // Does not to a sync processing on the diffs
        "pushToRedis": true // Pushes to redis the changes
    }
    "debug": false, // Will show timestamp and activity of redis-oplog.
    "overridePublishFunction": true // Meteor.publish becomes Meteor.publishWithRedis, set to false if you don't want to override it
  }
}
```

```
// or simpler it will apply the defaults above
{
    ...
    "redisOplog": {}
}
```

```bash
meteor run --settings settings.json
```

Or import this before anything else server-side. (It is very important that this is the first thing you load)
Make sure that if you use packages that initialize collections, even local ones, *cultofcoders:redis-oplog* needs to be loaded before them.

Note: Does not work with *insecure* package. Remove it and specify *allow* or *deny* for each collection. Thank you!

## Basic Usage

It's the SAME!

```js
// or Meteor.publishWithRedis if you chose overridePublishFunction as false

Meteor.publish('name', function (args) {
    // you can still return an array of cursors if you like.
    return Collection.find(selector, options);
})
```

```js
// inserting data is the same way you are used to
Messages.insert(message)
Messages.update(_id, message)
Messages.remove(_id)
Messages.upsert(selector, modifier) 
```

Friendly Warning! *upsert* is prone to very very rare race-conditions when it comes to dispatching the changed data. This only happens in a very busy collection,
Therefore if you want 100% consistency of real-time updates, we suggest to avoid it.

## How it works

### Sending changes

This package will allow you to use Redis pub/sub system to trigger changes. Any pub/sub system will work. We don't use Redis as a database,
we do not store anything in it.

We override the mutators from the Collection: `insert`, `update`, `upsert` and `remove` to publish the changes to redis immediately after they have been
sent to the database.

Let's take an example:
```
const Items = new Mongo.Collection('items')
Items.insert({text: 'Hello'})
```

After the insert is done into the database, we will publish to redis channel "items" (same name as the collection name) the fact
that we did an insert, and the *_id* of the document we inserted.

For an update, things get a bit interesting in the back:
```
Items.update(itemId, {
    $set: { text: 'Hello World!' }
})
```

This will publish the update event to "items" channel in Redis but also to "items::itemId" channel. 
The reason we do this will be explored later in this document. (Direct Processing)

We send to redis the update event along with the document *_id* and the fields that have been changed.

If you choose to update multiple elements based on a selector:
```
Items.update({archived: false}, {
    $set: {archived: true}
}, {multi: true})
```

In the back, we will fetch the ids (N length) that have ```{archived: false}```, it will perform the update, then it will send N messages to "messages" channel,
and another N messages to "items::itemId1", ... , "items::itemIdN" channels with the info regarding the update.

*All messages are sent to Redis asynchronously so you will have no perceived delay for your methods.*

Removing something is almost the same concept as updates, except ofcourse the event sent is "REMOVE" instead of "UPDATE"

### Listening to changes

When you create a publication in Meteor you return a cursor or an array of cursors. For example:

```
Meteor.publish('my_items', function () {
    return Items.find({userId: this.userId});
})
```

It will subscribe to the channel "items", and all incoming messages will be processed to see if it affects the query, and it will send
proper changes to the observer (the client)

We re-use publications that are the same, and redis channels that are the same. So processing is done as little as possible.

For example if you have a Blog Post with Comments displayed reactively, then all users that are subscribed to the comments for your blog post,
will share the same "watcher".

### Direct Processing

There is another special use-case for listening to changes, and it is related to cursor that are filtered by _ids. We call this "Direct Processing"

```
Meteor.publish('items', function () {
    return Items.find({_id: {$in: ids}});
    // this has the same behavior when you have a selector like {_id: 'XXX'}
})
```

In this case we won't listen to "items" channel at all. We will, instead, listen to multiple channels:
- items::id1
- items::id2
- ...
- items::idN

This is one of the most efficient ways to catch changes and process them. The cost of performing the diffs is very small.

## Stopping Reactivity

We extend the mutators `insert`, `update` and `remove` to allow an extra argument the configuration.

```
// no changes will be published to any redis channels
Collection.insert(document, {pushToRedis: false})
Collection.update(selector, document, {pushToRedis: false})
Collection.remove(selector, {pushToRedis: false})
```

## Optimistic UI (Latency Compensation)

Optimistic UI is a bit expensive in the sense that it will cause some delays to a method's return.
By default *optimistic* is disabled, meaning if you have a method that is both on client and server, it will not work accordingly unless
you pass the option ```{optimistic: true}```

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

Please note that if you are using Optimistic-UI and publish-composite, use `cultofcoders:publish-composite` instead which is a fork
of the original, the only difference is that it passes the connection.id along so RedisOplog can smartly identify
where to send the changes first so the method call has minimum response time, and no "flickers" will be experienced.

## Fine-Tuning

Now that we have a generic idea of how this works, we can make some fine-tuning that will **dramatically** increase the speed of your highly loaded app.

### Custom Channels

A very common scenario where this can be used is a chat application. Usually when we create a chat app, we have a parent "Thread",
and each message will have threadId pointing to our thread.

```js
Meteor.publish('messages_by_thread', function (threadId) {
    // perform additional security checks here

    return Messages.find(selector, {
        channel: 'threads::' + threadId + '::messages' // you can use any conventions that you like for naming them, it's not relevant
        // any name you choose just make sure it cannot conflict with a collection (threads), or a direct listening (threads::threadId)
    });
})
```

Now if you insert into `Messages` collection like you are used to, you will not see any changes. Because
the default channel it will push to is "messages" (because that's the name of our collection), but we are listening only to `threads::${threadId}::messages`, so
the solution is this:

```js
Messages.insert(data, {
    channel: `threads::` + threadId + '::messages'
});

Messages.update(messageId, {
    $set: {isRead: true}
}, {
    channel: `threads::` + threadId + '::messages'
});

Messages.remove(messageId, {
    channel: `threads::` + threadId + '::messages'
})
```

By doing this you have a very focused layer of reactivity. What happens in the back, is that instead of having your processor process every incomming
event in "messages" channel and figuring how it affects *all live queries*.

Note: Even if you use `channel`, making a change to an `_id` will still push to `messages::_id`, so it will still send 2 events to Redis.

### Namespacing

Namespaces are just a name for channels, but they prefix with the collection name. The purpose is to enable easy
multi-tenant systems. For example you have multiple companies that use the same app and share the same database. You can
easily laser-focus the reactivity for them by using this concept.

```js
Meteor.publish('users', function () {
    // get the company for this.userId

    return Users.find({companyId}, {namespace: 'company::' + companyId})
})
```

In the back, Redis will only listen to events sent to `company::companyId::users` channel

```js
// sample mutation that applies to the namespace
Users.insert(data, {
    namespace: 'company::' + companyId
})
```

You could have achieved the same thing with channels. But the idea is to make it easy.

Note: Even if you use `namespace`, making a change to an `_id` from Users will still push to `users::_id`, so it will still send 2 events to Redis.

### Allowed Options For Cursors

```js
{
    channel: 'customChannel' // it will only listen to customChannel channel
    channels: [] // array of strings, it will listen to those channels only
    namespace: 'namespaceString' // it will listen to namespaceString::actualCollectionName channel
    namespaces: [] // array of strings, it will listen to those namespaces only
}
```

### Allowed Options For Mutations

```
channel: String // will only reach the cursors that listen to this channel
channels: [String] // will reach all cursors that listen to any of these channels
namespace: String
namespaces: [String] 
optimistic: Boolean // default is false. This is wether or not to do the diff computation in sync so latency compensation works
pushToRedis: Boolean // default is true, use false if you don't want reactivity at all. Useful when doing large batch inserts/updates.
```

### Fallback to polling

If you like to go back to polling, it's no problem. It's the same API as Meteor uses.

```js
Meteor.publish('users', function (companyId) {
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

For example you have a game or a chat, and you want to transmit to the other user that he is typing his message.
You don't need to store `isTyping` in the database to do this.

```js
import { SyntheticMutator } from 'meteor/cultofcoders:redis-oplog';

SyntheticMutator.update(channelName, messageId, { // only works with specific _id
    $set: { 
        isTyping: true // you can use any modifier supported by minimongo
    }
})

// for the example above where we have fine-tuned chat by thread, the synthetic mutation needs to look like this
SyntheticMutator.update('threads::' + messageId + '::messages', messageId, {
    $set: { // you can use any modifier supported by minimongo
        selection: {
            value: 10
        }
    }
})

// If you put the Mongo.Collection object as first argument, it will transform itself to "messages" (the collection name)
Meteor.methods({
    'messages.start_typing'(messageId) {
        SyntheticMutator.update(MessagesCollection, messageId, {
            $addToSet: {
                typers: this.userId
            }
        })
    }
});

SyntheticMutator.insert(MessagesCollection, data); // it will generate a Random.id() as _id, that you can later update
SyntheticMutator.remove(MessagesCollection, _id); // only works with _id's
```

## Failsafe

If redis server fails, it will `console.error` this fact, and it will keep retrying to connect every 30 seconds.

## Stats

If you are interested in viewing how many observers are registered or memory consumption:
```
meteor shell
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog';

// works only server-side
RedisOplog.stats()
```

### Merging scenarios (old but gold)

This is a historical document, in which I squeezed my brain trying to make sense of the logic that applies to diffing live queries.

https://docs.google.com/document/d/1Cx-J7xwP9IlbEa54RiT_34GK4o8M6XpPieRvNPI_aUE/edit?usp=sharing

