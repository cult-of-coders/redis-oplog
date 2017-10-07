# How to Make Redis Oplog Initialize First

Redis Oplog must initialize before your collections. To do so, you must move it towards the top of your package list. The package list can be found in the `app/.meteor/packages` file.  

## Initialize Redis Oplog Manually

You could also load the package manually:

```javascript
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog'
RedisOplog.init(config);
```
