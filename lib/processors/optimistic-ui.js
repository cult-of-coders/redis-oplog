import { Events } from '../constants';

/**
 * Optimistic UI processor behaves similar to a synthetic processor.
 *
 * @param observableCollection
 * @param event
 * @param doc
 * @param modifier
 * @param modifiedTopLevelFields
 */
export default function (observableCollection, event, doc, modifier, modifiedTopLevelFields) {
    switch (event) {
        case Events.INSERT:
            handleInsert(observableCollection, doc);
            break;
        case Events.UPDATE:
            handleUpdate(observableCollection, doc, modifier, modifiedTopLevelFields);
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
        observableCollection.add(doc, true);
    }
};

/**
 * @param observableCollection
 * @param doc
 * @param modifier
 * @param modifiedTopLevelFields
 */
const handleUpdate = function (observableCollection, doc, modifier, modifiedTopLevelFields) {
    observableCollection.changeSynthetic(doc._id, modifier, modifiedTopLevelFields);
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