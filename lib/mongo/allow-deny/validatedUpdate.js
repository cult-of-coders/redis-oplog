/* eslint no-param-reassign: 0 no-underscore-dangle: 0 */
import { Meteor } from "meteor/meteor";
import { _ } from "meteor/underscore";
import { LocalCollection } from "meteor/minimongo";
import { check } from "meteor/check";
import transformDoc from "./transformDoc";

// Only allow these operations in validated updates. Specifically
// whitelist operations, rather than blacklist, so new complex
// operations that are added aren't automatically allowed. A complex
// operation is one that does more than just modify its target
// field. For now this contains all update operations except '$rename'.
// http://docs.mongodb.org/manual/reference/operators/#update
const ALLOWED_UPDATE_OPERATIONS = {
  $inc: 1,
  $set: 1,
  $unset: 1,
  $addToSet: 1,
  $pop: 1,
  $pullAll: 1,
  $pull: 1,
  $pushAll: 1,
  $push: 1,
  $bit: 1,
};

// Simulate a mongo `update` operation while validating that the access
// control rules set by calls to `allow/deny` are satisfied. If all
// pass, rewrite the mongo operation to use $in to set the list of
// document ids to change ##ValidatedChange
export default async function validatedUpdate(
  userId,
  selector,
  mutator,
  options
) {
  check(mutator, Object);
  options = _.clone(options) || {};

  if (!LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
    throw new Error("validated update should be of a single ID");
  }

  // We don't support upserts because they don't fit nicely into allow/deny
  // rules.
  if (options.upsert) {
    throw new Meteor.Error(
      403,
      "Access denied. Upserts not " + "allowed in a restricted collection."
    );
  }

  const noReplaceError =
    "Access denied. In a restricted collection you can only" +
    " update documents, not replace them. Use a Mongo update operator, such " +
    "as '$set'.";

  // compute modified fields
  const fields = [];
  if (_.isEmpty(mutator)) {
    throw new Meteor.Error(403, noReplaceError);
  }
  _.each(mutator, (params, op) => {
    if (op.charAt(0) !== "$") {
      throw new Meteor.Error(403, noReplaceError);
    } else if (!_.has(ALLOWED_UPDATE_OPERATIONS, op)) {
      throw new Meteor.Error(
        403,
        `Access denied. Operator ${op} not allowed in a restricted collection.`
      );
    } else {
      Object.keys(params).forEach((field) => {
        // treat dotted fields as if they are replacing their
        // top-level part
        if (field.indexOf(".") !== -1) {
          field = field.substring(0, field.indexOf("."));
        }

        // record the field we are trying to change
        if (!fields.includes(field)) {
          fields.push(field);
        }
      });
    }
  });

  const findOptions = { transform: null };
  if (!this._validators.fetchAllFields) {
    findOptions.fields = {};
    findOptions.projection = {};
    _.each(this._validators.fetch, (fieldName) => {
      findOptions.fields[fieldName] = 1;
      findOptions.projection[fieldName] = 1;
    });
  }

  const doc = await this._collection.findOneAsync(selector, findOptions);
  if (!doc) {
    // none satisfied!
    return 0;
  }

  // call user validators.
  // Any deny returns true means denied.
  if (
    _.any(this._validators.update.deny, (validator) => {
      const factoriedDoc = transformDoc(validator, doc);
      return validator(userId, factoriedDoc, fields, mutator);
    })
  ) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (
    _.all(this._validators.update.allow, (validator) => {
      const factoriedDoc = transformDoc(validator, doc);
      return !validator(userId, factoriedDoc, fields, mutator);
    })
  ) {
    throw new Meteor.Error(403, "Access denied");
  }

  options._forbidReplace = true;

  // Back when we supported arbitrary client-provided selectors, we actually
  // rewrote the selector to include an _id clause before passing to Mongo to
  // avoid races, but since selector is guaranteed to already just be an ID, we
  // don't have to any more.

  await this.updateAsync(
    selector,
    mutator,
    Object.assign(options, {
      optimistic: true,
    })
  );
}
