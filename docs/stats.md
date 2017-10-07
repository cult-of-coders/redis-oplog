## Stats

If you are interested in viewing how many observers are registered or memory consumption:
```
meteor shell
import { RedisOplog } from 'meteor/cultofcoders:redis-oplog';

// works only server-side
RedisOplog.stats()
```

