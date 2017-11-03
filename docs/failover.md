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

_.extend(Config.redisExtras.events, {
    reconnect({delay, attempt, error}) {
        // put your logic here. 
    },
    connect(err) {
        // put your logic here
    }
})
```