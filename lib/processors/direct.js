import { Events } from '../../constants';

export default function (observableCollection, event, doc) {
    switch (event) {
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

const handleUpdate = function (observableCollection, doc) {
    observableCollection.update(doc._id, doc);
};

const handleRemove = function (observableCollection, doc) {
    observableCollection.remove(doc._id);
};