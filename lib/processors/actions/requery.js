import { MongoIDMap } from '../../cache/mongoIdMap';

/**
 * @param observableCollection
 * @param documentMap 
 */
export default function (observableCollection, documentMap) {
    const { store, selector, options } = observableCollection;

    const newStore = new MongoIDMap();
    const freshIds = observableCollection.collection.find(
        selector, { ...options, fields: { _id: 1 } }).fetch();
    freshIds.forEach(doc => newStore.set(doc._id, doc));

    store.compareWith(newStore, {
        leftOnly(docId) {
            observableCollection.remove(docId);
        },
        both(docId) {
            if (documentMap[docId]) {
                observableCollection.change(documentMap[docId])
            }
        },
        rightOnly(docId) {
            if (documentMap[docId]) {
                observableCollection.add(documentMap[docId]);
            } else {
                observableCollection.addById(docId);
            }
        }
    });
}
