import { EJSON } from 'meteor/ejson';
import { Events } from '../../constants';
import { MongoIDMap } from '../../cache/mongoIdMap';
import SubscriptionInitialization from '../../cache/SubscriptionInitialization';

/**
 * @param observableCollection
 * @param newcomer
 * @param event
 * @param modifiedFields
 */
export default function (observableCollection, newcomer, event, modifiedFields) {
    const { store, selector, options } = observableCollection;

    const newStore = new MongoIDMap();
    let freshIds;
    SubscriptionInitialization.withValue(true, () => {
        freshIds = observableCollection.collection.find(selector, { ...options, fields: { _id: 1 } }).fetch();
    });
    freshIds.forEach((doc) => newStore.set(doc._id, doc));

    let added = false;
    store.compareWith(newStore, {
        leftOnly(docId) {
            observableCollection.remove(docId);
        },
        rightOnly(docId) {
            if (newcomer && EJSON.equals(docId, newcomer._id)) {
                added = true;
                observableCollection.add(newcomer);
            } else {
                observableCollection.addById(docId);
            }
        },
    });

    // if we have an update, and we have a newcomer, that newcomer may be inside the ids
    // TODO: maybe refactor this in a separate action (?)
    if (newcomer && Events.UPDATE === event && modifiedFields && !added && store.has(newcomer._id)) {
        observableCollection.change(newcomer, modifiedFields);
    }
}
