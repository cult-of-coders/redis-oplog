import { Events } from '../constants';
import SmartObject from '../utils/SmartObject';

import requery from './actions/requery';

/**
 * @param observableCollection
 * @param event
 * @param doc
 * @param affectedFields
 */
export default function (observableCollection, event, doc, affectedFields) {
    switch (event) {
        case Events.INSERT:
            handleInsert(observableCollection, doc);
            break;
        case Events.UPDATE:
            handleUpdate(observableCollection, doc, affectedFields);
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
        requery(observableCollection, doc);
    }
};

/**
 * @param observableCollection
 * @param doc
 * @param affectedFields
 */
const handleUpdate = function (observableCollection, doc, affectedFields) {
    const smartObject = new SmartObject(
        doc,
        observableCollection.selector.fields,
        observableCollection.options.sort,
        affectedFields
    );

    if (observableCollection.contains(doc._id)) {
        if (observableCollection.isEligibleByDB(doc._id)) {
            if (smartObject.fieldsExistInSortOptions(affectedFields)) {
                requery(observableCollection, doc, Events.UPDATE);
            } else {
                if (smartObject.fieldsExistInFieldsOptions(affectedFields)) {
                    observableCollection.change(doc._id, doc);
                }
            }
        } else {
            requery(observableCollection);
        }
    } else {
        if (observableCollection.isEligibleByDB(doc._id)) {
            if (smartObject.fieldsExistInSortOptions(affectedFields)) {
                requery(observableCollection, doc, Events.UPDATE);
            } else {
                if (smartObject.fieldsExistInFieldsOptions(affectedFields)) {
                    observableCollection.change(doc._id, doc);
                }
            }
        }
    }
};

/**
 * @param observableCollection
 * @param doc
 */
const handleRemove = function (observableCollection, doc) {
    if (observableCollection.contains(doc._id)) {
        requery(observableCollection, doc);
    } else {
        if (observableCollection.options.skip) {
            requery(observableCollection, doc)
        }
    }
};