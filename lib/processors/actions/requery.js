import { EJSON } from "meteor/ejson";
import { Events } from "../../constants";
import { MongoIDMap } from "../../cache/mongoIdMap";

/**
 * @param observableCollection
 * @param newCommer
 * @param event
 * @param modifiedFields
 */
export default async function (
  observableCollection,
  newCommer,
  event,
  modifiedFields
) {
  const { store, selector, options } = observableCollection;

  const newStore = new MongoIDMap();
  const freshIds = await observableCollection.collection
    .find(selector, { ...options, fields: { _id: 1 } })
    .fetchAsync();

  freshIds.forEach((doc) => newStore.set(doc._id, doc));

  let added = false;
  await store.compareWith(newStore, {
    async leftOnly(docId) {
      await observableCollection.remove(docId);
    },
    async rightOnly(docId) {
      if (newCommer && EJSON.equals(docId, newCommer._id)) {
        added = true;
        await observableCollection.add(newCommer);
      } else {
        await observableCollection.addById(docId);
      }
    },
  });

  // if we have an update, and we have a newcommer, that new commer may be inside the ids
  // TODO: maybe refactor this in a separate action (?)
  if (
    newCommer &&
    Events.UPDATE === event &&
    modifiedFields &&
    !added &&
    store.has(newCommer._id)
  ) {
    await observableCollection.change(newCommer, modifiedFields);
  }
}
