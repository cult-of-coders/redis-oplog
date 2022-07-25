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
optimistic: Boolean // default is true. This is wether or not to do the diff computation in sync so latency compensation works
pushToRedis: Boolean // default is true, use false if you don't want reactivity at all. Useful when doing large batch inserts/updates.
```

### Polling with RedisOplog

If you like to go back to polling, it's no problem. It's the same API as Meteor uses:

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

### Configuration at collection level

You may want to configure reactivity at the collection level.
This can have several applications, for example you have collections that don't require reactivity,
or you have a multi-tenant system, and you want to laser-focus reactivity per tenant.

```js
const Tasks = new Mongo.Collection('tasks');

Tasks.configureRedisOplog({
    mutation(options, {event, selector, modifier, doc}) { 
        // if you do this inside a method it can work
        const userId = Meteor.userId(); 
        // if not, you can pass it as an option in your mutation, and read it from options
        const companyId = getCompany(userId);
        Object.assign(options, {
              namespace: `company::${companyId}`
        });
    },
    cursor(options, selector) {
        // you have access to publication context in here
        // meaning you can do `this.userId`
        const companyId = getCompany(this.userId);
        
        // note that if you are doing Tasks.observeChanges({}) server-side, you will have to manually pass the userId
        // Task.observeChanges({ changed(), added(), removed(), userId })
        Object.assign(options, { 
            namespace: `company::${companyId}` 
        });
    },

    // Optional boolean that determines whether you would like to include
    // the entire previous document in your redis events
    shouldIncludePrevDocument: false,

    // If you set this to false, will offers you extreme speed when you have a lot of listeners, or when your listeners use a slave mongo database
    // If may also have negative impact on performance if you have very large documents
    protectAgainstRaceConditions: true,
})
```

These configurations are applied last, they are the final configuration extension point,
so you have to manage the situation in which you have multiple namespace configurations.

Inside the `mutation()` configuration function, in the `mutationObject` (the second parameter) you receive
data based on the event for example:

- For insert: `{event, doc}`, where event equals `Events.INSERT`
- For update/upsert: `{event, selector, modifier}`, where event equals `Events.UPDATE`
- For remove: `{event, selector}`, where event equals `Events.REMOVE`

The `Events` object can be imported like this:
```js
import {Events} from 'meteor/cultofcoders:redis-oplog';
```

The mutation() function is called before the actual mutation takes place.

To illustrate this better, if you have a collection where you don't need reactivity:
```js
const Tasks = new Mongo.Collection('tasks');

Tasks.configureRedisOplog({
    mutation(options) { 
        options.pushToRedis = false;
    }
})
```

If, for example, you don't have a multi-tenant system and you may want to laser-focus messages inside a thread this can work:
```js
Messages.configureRedisOplog({
    mutation(options, {event, selector, modifier, doc}) { 
        let threadId;
        if (event === Events.INSERT && doc.threadId) {
            threadId = doc.threadId;
        }
        if (event === Events.REMOVE) {
            // If it performs a remove by _id (which is the most usual)
            threadId = Messages.findOne({_id: selector._id}, {projection: {threadId: 1}}).threadId;
        }
        if (event === Events.UPDATE) {
            // If it performs an update by _id (which is the most usual)
            threadId = Messages.findOne({_id: selector._id}, {projection: {threadId: 1}}).threadId;
        }
        
        options.namespace = `threads::${threadId}`;
    },
    cursor(options, selector) {
        if (selector.threadId) {
            options.namespace = `threads::${selector.threadId}`; 
        }
    }
})
```

Using this may be much more complicated than just specifying namespaces wherever you do finds, mutations, however, this can be very well suited when you
have a multi-tenant system, many places in which you perform updates, or you want to easily disable reactivity for a collection,
or you want to fine-tune redis-oplog with in a non-instrusive way inside your existing publications or methods.

`shouldIncludePrevDocument` Allows you to enable passing through the previous document through the redis event messages. The default value for
`shouldIncludePrevDocument` is `false` but it can be enabled for each collection where you might need the previous document state on receiving updates

Example:
For a collection with `shouldIncludePrevDocument: false` the payload 'd' (document) field will contain only the document id after an update
```
{ 
    u: 'event_id', 
    f: [ 'fieldModified' ], 
    e: 'u', 
    d: { _id: 'document_id' } 
}
```
If that same collection now had `shouldIncludePrevDocument: true` the payload would now look like:
```
{ 
    u: 'event_id', 
    f: [ 'fieldModified' ], 
    e: 'u', 
    d: { _id: 'document_id', fieldModified: 'oldValue' } 
}
```


### Synthetic Mutation

This is to emulate a write to the database that you don't actually need persisted. Basically,
your publication would behave as if an actual update happened in the database.

You will use this for showing live things that happen, things that you don't want saved.

For example you have a game or a chat, and you want to transmit to the other user that he is typing his message.
You don't need to store `isTyping` in the database to do this.

```js
import { SyntheticMutator } from 'meteor/cultofcoders:redis-oplog';

// If you put the Mongo.Collection object as first argument, it will transform itself to "messages" (the collection name)
Meteor.methods({
    'messages.start_typing'(threadId) {
        // you can use any modifier supported by minimongo
        // only works with specific _id's, not selectors!
        SyntheticMutator.update(ThreadsCollection, threadId, {
            $addToSet: {
                currentlyTyping: this.userId
            }
        })
    }
});

// And in the client, you will instantly get access to the updated `doc.currentlyTyping`
// Even if it's not stored in the database, imagine the potential of this in real-time games.

// if data does not have an '_id' set, it will generate it with a Random.id() 
SyntheticMutator.insert(MessagesCollection, data); 

// synthetic deletion, like update, only works with specific _ids
SyntheticMutator.remove(MessagesCollection, _id); 
```

```js
// Be very careful here!
// If you perform an update to a channeled, namespaced collection
SyntheticMutator.update(`company::{companyId}::threads`, threadId, {});

// This will not work if you listen to a document by _id, you will have to specify direct processing channel:
SyntheticMutator.update([`company::{companyId}::threads`, `threads::${threadId}`], threadId, {});

// If you pass-in the collection instance as argument, this will be automatically done.
```