## Redis Unavailability

If redis server fails, it will `console.error` this fact, and it will keep retrying to connect every 30 seconds. Once connection is resumed
reactivity will be resumed. However, changes that happened while Redis was down will not be visible. In future we will treat this scenario.