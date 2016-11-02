import { _ } from 'meteor/underscore';

/**
 * @param observableCollection
 * @param newCommer
 */
export default function (observableCollection, newCommer) {
    const {store, selector, options} = observableCollection;
    const currentIds = _.keys(store);

    const freshIds = observableCollection.find(selector, _.extend(options, {
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

    if (newCommer && _.contains(currentIds, newCommer._id)) {
        observableCollection.change(newCommer._id, newCommer);
    }

    if (idsToAdd.length > 0) {
        // check if idsToAdd contains new commer
        let idsToFetch = [];

        if (newCommer && _.contains(idsToAdd, newCommer._id)) {
            observableCollection.add(newCommer._id, newCommer);
            idsToFetch = _.without(idsToAdd, newCommer._id)
        } else {
            idsToFetch = idsToAdd;
        }

        if (idsToFetch.length === 0) {
            return;
        }

        const objectsToAdd = observableCollection.find({
            _id: {
                $in: idsToFetch
            }
        }, options);

        objectsToAdd.forEach(doc => {
            observableCollection.add(doc._id, doc);
        })
    }
}