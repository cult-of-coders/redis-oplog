import { Events } from "../constants";

/**
 * @param observableCollection
 * @param event
 * @param doc
 * @param modifiedFields
 */
export default async function (
  observableCollection,
  event,
  doc,
  modifiedFields
) {
  switch (event) {
    case Events.UPDATE:
      await handleUpdate(observableCollection, doc, modifiedFields);
      break;
    case Events.REMOVE:
      await handleRemove(observableCollection, doc);
      break;
    case Events.INSERT:
      await handleInsert(observableCollection, doc);
      break;
    default:
      throw new Meteor.Error(`Invalid event specified: ${event}`);
  }
}

/**
 * @param observableCollection
 * @param doc
 */
const handleInsert = async function (observableCollection, doc) {
  if (
    !observableCollection.contains(doc._id) &&
    observableCollection.isEligible(doc)
  ) {
    await observableCollection.add(doc);
  }
};

/**
 * @param observableCollection
 * @param doc
 * @param modifiedFields
 */
const handleUpdate = async function (
  observableCollection,
  doc,
  modifiedFields
) {
  const otherSelectors = observableCollection.__containsOtherSelectorsThanId;

  if (otherSelectors) {
    if (observableCollection.isEligible(doc)) {
      if (observableCollection.contains(doc._id)) {
        await observableCollection.change(doc, modifiedFields);
      } else {
        await observableCollection.add(doc);
      }
    } else {
      if (observableCollection.contains(doc._id)) {
        await observableCollection.remove(doc._id);
      }
    }
  } else {
    if (observableCollection.contains(doc._id)) {
      await observableCollection.change(doc, modifiedFields);
    } else {
      await observableCollection.add(doc);
    }
  }
};

/**
 * @param observableCollection
 * @param doc
 */
const handleRemove = async function (observableCollection, doc) {
  await observableCollection.remove(doc._id);
};
