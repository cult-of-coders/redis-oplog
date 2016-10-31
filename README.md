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