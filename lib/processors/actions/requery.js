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
        // Any documents found only on the left store
        // should be removed
        leftOnly(docId) {
            observableCollection.remove(docId);
        },
        // Any documents found in both and with documentMap entries
        // have received redis updates indicating there are changes
        both(docId) {
            if (documentMap[docId]) {
                observableCollection.change(documentMap[docId])
            }
        },
        // Any documents only present in the right store are newly
        // added
        rightOnly(docId) {
            if (documentMap[docId]) {
                observableCollection.add(documentMap[docId]);
            } else {
                observableCollection.addById(docId);
            }
        }
    });
}
