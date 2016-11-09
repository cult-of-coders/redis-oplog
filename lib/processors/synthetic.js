import { Events } from '../constants';

/**
 * Synthetic processors processes virtual mutations that aren't actually persisted in the database
 * But it will make it behave like they were.
 *
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
    if (observableCollection.isEligible(doc)) {
        observableCollection.add(doc);
    }
};

/**
 * @param observableCollection
 * @param doc
 */
const handleUpdate = function (observableCollection, doc) {
    if (observableCollection.contains(doc._id)) {
        observableCollection.change(doc._id, doc);
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