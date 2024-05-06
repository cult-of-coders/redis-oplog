import { _ } from "meteor/underscore";
import { MongoIDMap } from "../../cache/mongoIdMap";

/**
 * Most likely used when redis connection resumes.
 * It refreshes the collection from the database.
 *
 * @param observableCollection
 */
export default async function (observableCollection) {
  const { store, cursor } = observableCollection;

  const freshData = await cursor.fetchAsync();

  const newStore = new MongoIDMap();
  freshData.forEach((doc) => newStore.set(doc._id, doc));

  await store.compareWith(newStore, {
    async both(docId, oldDoc, newDoc) {
      const modifiedFields = _.union(Object.keys(oldDoc), Object.keys(newDoc));
      await observableCollection.change(newDoc, modifiedFields);
    },
    async leftOnly(docId) {
      await observableCollection.remove(docId);
    },
    async rightOnly(docId, newDoc) {
      await observableCollection.add(newDoc);
    },
  });
}
