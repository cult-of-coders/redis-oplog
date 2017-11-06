import {_} from 'meteor/underscore';

/**
 * Most likely used when redis connection resumes.
 * It refreshes the collection from the database.
 *
 * @param observableCollection
 */
export default function (observableCollection) {
    const {store, cursor} = observableCollection;

    const freshData = cursor.fetch();

    const freshIds = _.pluck(freshData, '_id');
    const currentIds = _.keys(store);

    const idsToAdd = _.difference(freshIds, currentIds);
    const idsToRemove = _.difference(currentIds, freshIds);
    const idsToUpdate = _.intersection(currentIds, freshIds);

    idsToRemove.forEach(_id => {
        observableCollection.remove(_id);
    });

    idsToAdd.forEach(_id => {
        const data = _.find(freshData, o => o._id == _id);
        observableCollection.add(data);
    });

    idsToUpdate.forEach(_id => {
        const data = _.find(freshData, o => o._id == _id);
        observableCollection.change(data, _.keys(data));
    })
}