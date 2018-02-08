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
            if (
                hasSortFields(observableCollection.options.sort, modifiedFields)
            ) {
                // This document isn't in the observable collection, but a field that
                // is related to sorting has changed, so the order and image may have changed
                requery(
                    observableCollection,
                    doc,
                    Events.UPDATE,
                    modifiedFields
                );
            } else {
                // If the document is now eligible and it does not belong in the initial values
                // We only add it to the store if and only if we do not surpass the limit
                if (!observableCollection.isLimitReached()) {
                    observableCollection.add(doc);
                }
            }
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
