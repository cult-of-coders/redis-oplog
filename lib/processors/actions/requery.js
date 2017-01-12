import { _ } from 'meteor/underscore';
import { Events } from '../../constants';

/**
 * @param observableCollection
 * @param newCommer
 * @param event
 */
export default function (observableCollection, newCommer, event, modifiedFields) {
    const {store, selector, options} = observableCollection;
    const currentIds = _.keys(store);

    const freshIds = observableCollection.collection.find(selector, _.extend({}, options, {
        fields: {
            _id: 1
        }
    })).fetch().map(doc => doc._id);

    // what new ids are in freshIds but not in currentIds
    const idsToAdd = _.difference(freshIds, currentIds);
    const idsToRemove = _.difference(currentIds, freshIds);

    if (idsToRemove.length > 0) {
        idsToRemove.forEach(_id => observableCollection.remove(_id))
    }

    // if we have an update, and we have a newcommer, that new commer may be inside the ids
    // TODO: maybe refactor this in a separate action (?)
    if (newCommer
        && Events.UPDATE === event
        && modifiedFields
        && !_.contains(idsToAdd, newCommer._id)
        && !_.contains(idsToRemove, newCommer._id)) {
        observableCollection.change(newCommer._id, modifiedFields);
    }

    if (idsToAdd.length > 0) {
        const objectsToAdd = observableCollection.collection.find({
            _id: {
                $in: idsToAdd
            }
        }, options);

        objectsToAdd.forEach(doc => {
            observableCollection.add(doc, true);
        })
    }
}