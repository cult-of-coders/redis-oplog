import { _ } from 'meteor/underscore';
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

    const idIndexes = {};
    freshIds.forEach((doc, index) => {
      newStore.set(doc._id, doc);
      idIndexes[newStore._idStringify(doc._id)] = index;
    });

    let added = false;
    store.compareWith(newStore, {
        both(docId, leftValue, rightValue) {
          const beforeId = newStore._idStringify((freshIds[idIndexes[newStore._idStringify(docId)] + 1] || {})._id);
          if (!EJSON.equals(leftValue, rightValue)) {
            observableCollection.movedBefore(docId, beforeId);
          }
        },
        leftOnly(docId) {
            observableCollection.remove(docId);
        },
        rightOnly(docId) {
          const beforeId = newStore._idStringify((freshIds[idIndexes[newStore._idStringify(docId)] + 1] || {})._id);
            if (newCommer && EJSON.equals(docId, newCommer._id)) {
                added = true;
                observableCollection.add(newCommer, false, beforeId);
            } else {
                observableCollection.addById(docId, beforeId);
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
