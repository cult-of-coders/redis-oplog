
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

We extend the mutators `insert`, `update` and `remove` to allow an extra argument that configures the mutation.

```
// no changes will be published to any redis channels
Collection.insert(document, {pushToRedis: false})
Collection.update(selector, document, {pushToRedis: false})
Collection.remove(selector, {pushToRedis: false})
```
