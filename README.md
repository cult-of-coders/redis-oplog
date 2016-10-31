**Work in progress. Not working. Not on atmosphere yet.**


## What ?

This is a replacement for MongoDB's oplog with Pub/Sub Redis.

## Why ?

Reactivity will be triggered by a mutation, something that happens in the app.
This enables ability to fine-tune the level of reactivity and we can even disable it, if we want to make updates in large-batches,
like migrations or something that does not require reactivity.

## Data Flow:

- Insert/Update/Remova => publish to Redis "collectionName::*"
- Publications subscribe to "collectionName::*" and process changes for the client
- We will also have dedicated channels for publications that filter by _id "collectionName::_id"
- Additional support for reactivity namespacing, that can enable creating a chat app in Meteor like:

```
// inserting data
Messages.insert(message, {namespace: ['thread-${threadId']}

Meteor.publishRedis('chat', function (threadId) {
    return Messages.find({threadId}, {}, {namespace: 'thread-${threadId}'});
})
```



## Some scraps, pls ignore.


TODO:

- Handle limit + sort
- Do not allow limit without sort
- Handle only specific fields
- Handle separate channels for subscription based on _id or $in: [_ids]


STRATEGIES:

LIMIT + SORT:

- If limit + sort (+ skip)
    - Case Remove an existing document
        re-run query, update diffs
    - Case insert
        if filters
            - check if eligible
        check if it would affect the query
            - diff the changes to the query
    - Case update
        if filters
            - check if eligible
        check if it would affect the query
            - diff the changes to the query

Check if it would affect the query:
    - insert
        add it to the collection, perform sort and limits, if different
        remove one element and add the new one
    - update
        if element in the collection of the client
            - check eligibility
                - if not eligible
                    - get the next element for the query in the db
                - if eligible but affects stort
                    - ...
        
        if element not in the collection of the client
            - add it to the collection, perform sort and limits, if different
            - remove one element and add the new one
        
- If sort
    - Sorting should always be done on the client for this case.
    
DEDICATED CHANNELS:
- Listen to collectionName::_id changes, update and remove only

DEFAULT:
- Like it works now