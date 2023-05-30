import { EJSON } from 'meteor/ejson';
import { Events } from '../../constants';
import { MongoIDMap } from '../../cache/mongoIdMap';

/**
 * @param observableCollection
 * @param newCommer
 * @param event
 * @param modifiedFields
 */
export default function (observableCollection, newCommer, event, modifiedFields) {
    const { store, selector, options } = observableCollection;

    const newStore = new MongoIDMap();
    const freshIds = observableCollection.collection.find(
        selector, { ...options, fields: { _id: 1 } }).fetch();
    freshIds.forEach(doc => newStore.set(doc._id, doc));

    let added = false;
    store.compareWith(newStore, {
        leftOnly(docId) {
            observableCollection.remove(docId);
        },
        rightOnly(docId) {
            if (newCommer && EJSON.equals(docId, newCommer._id)) {
                added = true;
                observableCollection.add(newCommer);
            } else {
                observableCollection.addById(docId);
            }
        }
    });

    // if we have an update, and we have a newcommer, that new commer may be inside the ids
    // TODO: maybe refactor this in a separate action (?)
    if (newCommer
        && Events.UPDATE === event
        && modifiedFields
        && !added
        && store.has(newCommer._id)) {
        observableCollection.change(newCommer, modifiedFields);
    }
}
