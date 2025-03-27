import { Events } from "../constants";
import { hasSortFields } from "./lib/fieldsExist";
import requery from "./actions/requery";

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
    case Events.INSERT:
      await handleInsert(observableCollection, doc);
      break;
    case Events.UPDATE:
      await handleUpdate(observableCollection, doc, modifiedFields);
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
    await requery(observableCollection, doc);
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
  if (observableCollection.contains(doc._id)) {
    if (observableCollection.isEligible(doc)) {
      if (hasSortFields(observableCollection.options.sort, modifiedFields)) {
        await requery(observableCollection, doc, Events.UPDATE, modifiedFields);
      } else {
        observableCollection.change(doc, modifiedFields);
      }
    } else {
      await requery(observableCollection);
    }
  } else {
    if (observableCollection.isEligible(doc)) {
      await requery(observableCollection, doc, Events.UPDATE, modifiedFields);
    }
  }
};

/**
 * @param observableCollection
 * @param doc
 */
const handleRemove = async function (observableCollection, doc) {
  if (observableCollection.contains(doc._id)) {
    await requery(observableCollection, doc);
  } else {
    if (observableCollection.options.skip) {
      await requery(observableCollection, doc);
    }
  }
};
