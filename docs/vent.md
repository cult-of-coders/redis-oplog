## Redis Vent

### API
```js
// server
Vent.publish({
    'threadMessage'({threadId}) {
        // check permissions, you have access to userId
        
        // registers listeners on redis
        this.on(`threads::${threadId}::new_message`, ({message}) => {
            return {message};
        });
        // access to publication context
    }    
})

// Vent.publish('threadMessage', {threadId}) also works

// some other part server
Meteor.methods({
    'messages.add'({threadId, message}) {
        // makes an insert without taking it to redis-oplog
        Messages.insert(message, {
            pushToRedis: false,
        });
        
        // dispatches event to redis
        Vent.emit(`threads::${threadId}::new_message`, {message});
    }
})

// client
const handler = Vent.subscribe('onNewMessage', {threadId});

handler.listen(function ({message}) {
    // handle
});

// stops all the listeners and the subscription
handler.ready(); // returns boolean if the subscription has been marked as ready
handler.stop();
```

### Behind the scenes

Vent creates a unique local collection for every subscription.  
