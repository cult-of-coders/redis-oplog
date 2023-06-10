import { _ } from 'meteor/underscore';
import { MongoIDMap } from '../../cache/mongoIdMap';

/**
 * Most likely used when redis connection resumes.
 * It refreshes the collection from the database.
 *
 * @param observableCollection
 */
export default function (observableCollection) {
    const { store, cursor } = observableCollection;

    const freshData = cursor.fetch();

    const newStore = new MongoIDMap();
    freshData.forEach((doc) => newStore.set(doc._id, doc));

    store.compareWith(newStore, {
        both(docId, oldDoc, newDoc) {
            const modifiedFields = _.union(Object.keys(oldDoc), Object.keys(newDoc));
            observableCollection.change(newDoc, modifiedFields);
        },
        leftOnly(docId) {
            observableCollection.remove(docId);
        },
        rightOnly(docId, newDoc) {
            observableCollection.add(newDoc);
        },
    });
}
