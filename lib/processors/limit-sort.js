import { Meteor } from 'meteor/meteor';
import RedisPipe, { Events } from '../constants';
import { hasSortFields } from './lib/fieldsExist';
import requery from './actions/requery';
import Config from '../config';


/**
 * @param observableCollection
 * @param doc
 */
const handleInsert = (observableCollection, doc) => {
    if (observableCollection.isEligible(doc)) {
        return true;
    }

    return false;
};

/**
* @param observableCollection
* @param doc
* @param modifiedFields
*/
const handleUpdate = (observableCollection, doc, modifiedFields) => {
    if (observableCollection.contains(doc._id)) {
        if (observableCollection.isEligible(doc)) {
            if (
                hasSortFields(observableCollection.options.sort, modifiedFields)
            ) {
                return true;
            }

            observableCollection.change(doc, modifiedFields);
        } else {
            return true;
        }
    } else if (observableCollection.isEligible(doc)) {
        return true;
    }

    return false;
};

/**
* @param observableCollection
* @param doc
*/
const handleRemove = (observableCollection, doc) => {
    if (observableCollection.contains(doc._id)) {
        return true;
    } else if (observableCollection.options.skip) {
        return true;
    }

    return false;
};

/**
 * @param observableCollection
 * @param event
 * @param doc
 * @param modifiedFields
 */
export default function(observableCollection, events, documentMap) {
    let needsRequery = events.length > Config.maxRedisEventsToProcess;

    if (!needsRequery) {
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const docId = event[RedisPipe.DOC]._id;
            const modifiedFields = event[RedisPipe.FIELDS];
            const doc = documentMap[docId];

            switch (event[RedisPipe.EVENT]) {
                case Events.INSERT:
                    needsRequery = handleInsert(observableCollection, doc);
                    break;
                case Events.UPDATE:
                    needsRequery = handleUpdate(observableCollection, doc, modifiedFields);
                    break;
                case Events.REMOVE:
                    needsRequery = handleRemove(observableCollection, doc);
                    break;
                default:
                    throw new Meteor.Error(`Invalid event specified: ${event}`);
            }

            if (needsRequery) {
                break;
            }
        }
    }

    if (needsRequery) {
        requery(observableCollection, documentMap);
    }
}