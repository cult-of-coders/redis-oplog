import { Events } from '../constants';
import { hasSortFields } from './lib/fieldsExist';
import requery from './actions/requery';

/**
 * @param observableCollection
 * @param event
 * @param doc
 * @param modifiedFields
 */
export default function(observableCollection, event, doc, modifiedFields) {
    switch (event) {
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

/**
 * @param observableCollection
 * @param doc
 */
const handleInsert = function(observableCollection, doc) {
    if (observableCollection.isEligible(doc)) {
        requery(observableCollection, doc);
    }
};

/**
 * @param observableCollection
 * @param doc
 * @param modifiedFields
 */
const handleUpdate = function(observableCollection, doc, modifiedFields) {
    if (observableCollection.contains(doc._id)) {
        if (observableCollection.isEligible(doc)) {
            if (
                hasSortFields(observableCollection.options.sort, modifiedFields)
            ) {
                requery(
                    observableCollection,
                    doc,
                    Events.UPDATE,
                    modifiedFields
                );
            } else {
                observableCollection.change(doc, modifiedFields);
            }
        } else {
            requery(observableCollection);
        }
    } else {
        if (observableCollection.isEligible(doc)) {
            requery(
                observableCollection,
                doc,
                Events.UPDATE,
                modifiedFields
            );
        }
    }
};

/**
 * @param observableCollection
 * @param doc
 */
const handleRemove = function(observableCollection, doc) {
    if (observableCollection.contains(doc._id)) {
        requery(observableCollection, doc);
    } else {
        if (observableCollection.options.skip) {
            requery(observableCollection, doc);
        }
    }
};
