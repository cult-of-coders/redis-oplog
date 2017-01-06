import { Events } from '../constants';

/**
 * @param observableCollection
 * @param event
 * @param doc
 */
export default function (observableCollection, event, doc) {
    switch (event) {
        case Events.INSERT:
            handleInsert(observableCollection, doc);
            break;
        case Events.UPDATE:
            handleUpdate(observableCollection, doc);
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
 */
const handleInsert = function (observableCollection, doc) {
    if (!observableCollection.contains(doc._id) && observableCollection.isEligibleByDB(doc._id)) {
        observableCollection.addById(doc._id);
    }
};

/**
 * @param observableCollection
 * @param doc
 */
const handleUpdate = function (observableCollection, doc) {
    if (observableCollection.isEligibleByDB(doc._id)) {
        if (observableCollection.contains(doc._id)) {
            observableCollection.change(doc._id, doc);
        } else {
            observableCollection.addById(doc._id);
        }
    } else {
        if (observableCollection.contains(doc._id)) {
            observableCollection.remove(doc._id);
        }
    }
};

/**
 * @param observableCollection
 * @param doc
 */
const handleRemove = function (observableCollection, doc) {
    if (observableCollection.contains(doc._id)) {
        observableCollection.remove(doc._id);
    }
};