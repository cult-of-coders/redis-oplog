import { Events } from "../constants";

/**
 * Synthetic processors processes virtual mutations that aren't actually persisted in the database
 * But it will make it behave like they were.
 *
 * @param observableCollection
 * @param event
 * @param doc
 * @param modifier
 * @param modifiedTopLevelFields
 */
export default async function (
  observableCollection,
  event,
  doc,
  modifier,
  modifiedTopLevelFields
) {
  switch (event) {
    case Events.INSERT:
      await handleInsert(observableCollection, doc);
      break;
    case Events.UPDATE:
      await handleUpdate(
        observableCollection,
        doc,
        modifier,
        modifiedTopLevelFields
      );
      break;
    case Events.REMOVE:
      await handleRemove(observableCollection, doc);
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
  if (observableCollection.isEligible(doc)) {
    await observableCollection.add(doc, true);
  }
};

/**
 * @param observableCollection
 * @param doc
 * @param modifier
 * @param modifiedTopLevelFields
 */
const handleUpdate = async function (
  observableCollection,
  doc,
  modifier,
  modifiedTopLevelFields
) {
  await observableCollection.changeSynthetic(
    doc._id,
    modifier,
    modifiedTopLevelFields
  );
};

/**
 * @param observableCollection
 * @param doc
 */
const handleRemove = async function (observableCollection, doc) {
  if (observableCollection.contains(doc._id)) {
    await observableCollection.remove(doc._id);
  }
};
