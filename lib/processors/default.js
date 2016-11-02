import { Events } from '../../constants';

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

const handleInsert = function (observableCollection, doc) {
    if (observableCollection.isEligible(doc)) {
        observableCollection.add(doc);
    }
};

const handleUpdate = function (observableCollection, doc) {
    if (observableCollection.isEligible(doc)) {
        if (observableCollection.contains(doc._id)) {
            observableCollection.update(doc._id, doc);
        } else {
            observableCollection.add(doc);
        }
    } else {
        if (observableCollection.contains(doc._id)) {
            observableCollection.remove(doc._id);
        }
    }
};

const handleRemove = function (observableCollection, doc) {
    if (observableCollection.contains(doc._id)) {
        observableCollection.remove(doc._id);
    }
};