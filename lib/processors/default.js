import { Meteor } from 'meteor/meteor';
import Config from '../config';
import RedisPipe, { Events } from '../constants';
import requery from './actions/requery';

/**
 * @param observableCollection
 * @param doc
 */
const handleInsert = (observableCollection, doc) => {
    if (
        !observableCollection.contains(doc._id) &&
        observableCollection.isEligible(doc)
    ) {
        observableCollection.add(doc);
    }
};

/**
* @param observableCollection
* @param doc
* @param modifiedFields
*/
const handleUpdate = (observableCollection, doc, modifiedFields) => {
    if (observableCollection.isEligible(doc)) {
        if (observableCollection.contains(doc._id)) {
            observableCollection.change(doc, modifiedFields);
        } else {
            observableCollection.add(doc);
        }
    } else if (observableCollection.contains(doc._id)) {
        observableCollection.remove(doc._id);
    }
};

/**
* @param observableCollection
* @param doc
*/
const handleRemove = (observableCollection, doc) => {
    if (observableCollection.contains(doc._id)) {
        observableCollection.remove(doc._id);
    }
};

/**
 * @param observableCollection 
 * @param events 
 * @param documentMap 
 */
export default function(observableCollection, events, documentMap) {
    const needsRequery = events.length > Config.maxRedisEventsToProcess;

    if (needsRequery) {
        requery(observableCollection, documentMap);
        return;
    }

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const docId = event[RedisPipe.DOC]._id;
        const modifiedFields = event[RedisPipe.FIELDS];
        const doc = documentMap[docId];

        switch (event[RedisPipe.EVENT]) {
            case Events.INSERT:
                handleInsert(observableCollection, doc);
                break;
            case Events.UPDATE:
                handleUpdate(observableCollection, doc, modifiedFields);
                break;
            case Events.REMOVE:
                handleRemove(observableCollection, doc);
                break;
            default:
                throw new Meteor.Error(`Invalid event specified: ${event}`);
        }
    }
}
