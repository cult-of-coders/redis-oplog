import { Events } from '../constants';
import SmartObject from '../utils/SmartObject';

import requery from './actions/requery';

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

const handleInsert = function (observableCollection, doc) {
    if (observableCollection.isEligible(doc)) {
        requery(observableCollection, doc);
    }
};

const handleUpdate = function (observableCollection, doc, affectedFields) {
    const smartObject = new SmartObject(
        doc,
        observableCollection.selector.fields,
        observableCollection.options.sort,
        affectedFields
    );

    if (observableCollection.contains(doc._id)) {
        if (observableCollection.isEligible(doc)) {
            if (smartObject.affectedFieldsExistInSort()) {
                requery(observableCollection, doc);
            } else {
                if (smartObject.affectedFieldsExistInFieldsOptions()) {
                    observableCollection.change(doc._id, doc);
                }
            }
        } else {
            requery(observableCollection);
        }
    } else {
        if (observableCollection.isEligible(doc)) {
            if (smartObject.affectedFieldsExistInSort()) {
                requery(observableCollection, doc);
            } else {
                if (smartObject.affectedFieldsExistInFieldsOptions()) {
                    observableCollection.change(doc._id, doc);
                }
            }
        }
    }
};

const handleRemove = function (observableCollection, doc) {
    if (observableCollection.contains(doc._id)) {
        requery(observableCollection, doc);
    } else {
        if (observableCollection.options.skip) {
            requery(observableCollection, doc)
        }
    }
};