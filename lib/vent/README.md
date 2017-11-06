## Redis Vent

### API
```js
// server
Vent.listeners({
    'threadMessage'({threadId}) {
        // check permissions, you have access to userId
        
        // registers listeners on redis
        this.on(`messages::${threadId}::new`, ({message}) => {
            return {message};
        });
        // access to publication context
    }    
})

// some other part server
Meteor.methods({
    'messages.add'({threadId, message}) {
        // makes an insert without taking it to redis-oplog
        Messages.insert(message, {
            pushToRedis: false,
        });
        
        // dispatches event to redis
        Vent.emit(`messages::${threadId}::new`, {message});
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

