## Redis Vent

The Redis Vent allows you to send custom events from the server to the clients that subscribe to it.
These messages will not be stored in any way on the server.

You may need this if you want absolute control over the reactivity.

It uses Redis of course to communicate events to all instances in your infrastructure that share the same Redis connection.

What this means:
1. You can implement a very efficient and scalable chat application, at the expense of writing more code to achieve this, which is normal.
2. You can emulate reactivity with other databases/apis other than mongo.

### API

On the server:
```js
import {Vent} from 'meteor/cultofcoders:redis-oplog';

// This creates a publication end-point (make sure the name does not collide with any existing publish endpoints)
Vent.publish({
    'threadMessage'({threadId}) {
        // check permissions, you have access to this.userId, because you are in publish context
        
        // registers listeners on redis
        // a listener gets a message and returns an event to be sent
        // if you return a falsey value, it will not be sent (like return undefined | null | 0 | false)
        // so if you need to send a Number that can reach zero or a Boolean as your message make sure
        // to wrap it in an object
        this.on(`threads::${threadId}::new_message`, ({message}) => {
            return {message};
        });
    }    
})

// Also works
Vent.publish('threadMessage', function({threadId}) {
    // The classic way of defining publications also works
});

// Some other part server
Meteor.methods({
    'messages.add'({threadId, message}) {
        // makes an insert without taking it to redis-oplog
        Messages.insert(message, {
            pushToRedis: false,
        });
        
        // dispatches event to redis on the specified channel
        Vent.emit(`threads::${threadId}::new_message`, {message});
    }
})
```

On the client:
```js
import {Vent} from 'meteor/cultofcoders:redis-oplog';

// same handler from Meteor.subscribe, extended with a listen() function
const handler = Vent.subscribe('threadMessage', {threadId});

handler.listen(function ({message}) {
    // handle it
    // the object receives is the one returned from the 'on' function
});

// returns boolean if the subscription has been marked as ready 
handler.ready(); 

// stops all the listeners and the subscription
handler.stop();
```

### Making anything reactive

If for example, you have a shop, and it takes a bit of time to confirm the payment, and after it has been confirmed
you want to notify that client you can do something like this

1. Create your publish end-point
```js
Vent.publish('paymentStatus', function ({paymentId}) {
    // check user permissions ofcourse
    
    this.on(`payments::${paymentId}::updated`, function ({status}) {
        // what is returned to hits the client listener()
        return {status}
    })
})
```

2. Subscribe to it on the client
```js
import {Vent} from 'meteor/cultofcoders:redis-oplog';

const handler = Vent.subscribe('paymentStatus', {paymentId});
handler.listen(function ({status}) {
    if (status === StatusEnum.PAID) {
        // do something
    }
})
```

3. Sending it to Redis

Most likely here you will have a unique webhook that accepts payment status updates from your payment processors

```js
import {Vent} from 'meteor/cultofcoders:redis-oplog';

// in a separate server, or in the same server, doesn't matter
// when messages from your payment processors are received
function handlePayment(payment) {
    const status = payment.status;
    
    Vent.emit(`payments::${paymentId}::updated`, {status});
}

// The event emission can happen in any server written in any language
// It just needs to publish a JSON parseable string to Redis on the channel: `payments::${paymentId}::updated` 
```

Ofcourse, you could have done this easily just by subscribing to a Payment document by id,
and when it became paid do something. 

This doesn't mean you should only use this approach or the document by _id approach, it just means
that you have the flexibility of doing what you need.

### Behind the scenes

Vent hooks into DDP client and listens very efficiently to events sent out. Then calls the attached listeners.
 
Each Vent subscription is unique, meaning you can have multiple subscriptions to the same publication end-point,
for example:

```js
const handler_1 = Vent.subscribe('threadMessage', {threadId: threadId_1});
const handler_2 = Vent.subscribe('threadMessage', {threadId: threadId_2});
```

And their listeners are going to be unique as well, working as you expect it to work.

The way it does it, it creates a unique collection name and when subscribing, it sends that unique collection name as a parameter.
This way the server knows where to send the changed events.

Initially the server will send an .added event with an `_id: 'id'`, then the events will be sent via .changed event for `_id: 'id'` along with the `{event}` object

We don't create any LocalCollection per subscription, as you expect, because it hooks into all the messages incomming from DDP,
does a quick check to see if it's a `vent` and calls the attached listener.
