## Configuration

You have access to the following events:
- end
- connect
- reconnect
- error

They are documented inside the redis package:
https://www.npmjs.com/package/redis#connection-and-other-events

In order to configure these events, you can do it like this:

```js
// in a server-side file that is loaded on startup
import { Config } from 'meteor/cultofcoders:redis-oplog';

Object.assign(Config.redisExtras.events, {
    reconnect({delay, attempt, error}) {
        // put your logic here. 
    },
    connect(err) {
        // put your logic here
    },
})
```

## Notes

Since we have the logic of refreshing an observable collection, we can make it so it falls back to polling.
But polling is very dangerous and very expensive, so we should avoid it at all costs, however
this could be implemented and customized per collection, but honestly, your redis-server needs to have
high-availability, since it's a core component of your app.
