import { Events } from '../constants';

/**
 * @param observableCollection
 * @param event
 * @param doc
 * @param modifiedFields
 */
export default function (observableCollection, event, doc, modifiedFields) {
    switch (event) {
        case Events.UPDATE:
            handleUpdate(observableCollection, doc, modifiedFields);
            break;
        case Events.REMOVE:
            handleRemove(observableCollection, doc);
            break;
        default:
            throw new Meteor.Error(`Invalid event specified: ${event}`)
    }
}

/**
 * @param observableCollection
 * @param doc
 * @param modifiedFields
 */
const handleUpdate = function (observableCollection, doc, modifiedFields) {
    const otherSelectors = observableCollection.__containsOtherSelectorsThanId;

    if (otherSelectors) {
        if (observableCollection.isEligibleByDB(doc)) {
            if (observableCollection.contains(doc._id)) {
                observableCollection.change(doc._id, modifiedFields);
            } else {
                observableCollection.addById(doc._id);
            }
        } else {
            observableCollection.remove(doc._id);
        }
    } else {
        if (observableCollection.contains(doc._id)) {
            // TODO: verify if modifiedFields exist in fields
            observableCollection.change(doc._id, modifiedFields);
        } else {
            observableCollection.addById(doc);
        }
    }
};

/**
 * @param observableCollection
 * @param doc
 */
const handleRemove = function (observableCollection, doc) {
    observableCollection.remove(doc._id);
};

// There is no handleInsert since we filter by ids
