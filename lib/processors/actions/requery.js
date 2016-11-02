import { _ } from 'meteor/underscore';
import { Events } from '../../constants';

/**
 * @param observableCollection
 * @param newCommer
 * @param event
 */
export default function (observableCollection, newCommer, event) {
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

    if (Events.UPDATE === event) {
        if (newCommer && _.contains(currentIds, newCommer._id)) {
            observableCollection.change(newCommer._id, newCommer);
        }
    }

    if (idsToAdd.length > 0) {
        // check if idsToAdd contains new commer
        // let idsToFetch = [];
        //
        // if (event !== Events.REMOVE && newCommer && _.contains(idsToAdd, newCommer._id)) {
        //     observableCollection.add(newCommer);
        //     idsToFetch = _.without(idsToAdd, newCommer._id)
        // } else {
        //     idsToFetch = idsToAdd;
        // }

        const objectsToAdd = observableCollection.collection.find({
            _id: {
                $in: idsToAdd
            }
        }, options);

        objectsToAdd.forEach(doc => {
            observableCollection.add(doc);
        })
    }
}