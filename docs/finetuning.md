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
Meteor.publish('users', function (companyId) {
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
