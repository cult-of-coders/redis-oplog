/* eslint no-param-reassign: 0 no-underscore-dangle: 0 */
import { Meteor } from "meteor/meteor";
import { _ } from "meteor/underscore";
import transformDoc from "./transformDoc";

export default async function validatedRemove(userId, selector) {
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
    return 0;
  }

  // call user validators.
  // Any deny returns true means denied.
  if (
    _.any(this._validators.remove.deny, (validator) =>
      validator(userId, transformDoc(validator, doc))
    )
  ) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (
    _.all(
      this._validators.remove.allow,
      (validator) => !validator(userId, transformDoc(validator, doc))
    )
  ) {
    throw new Meteor.Error(403, "Access denied");
  }

  // Back when we supported arbitrary client-provided selectors, we actually
  // rewrote the selector to {_id: {$in: [ids that we found]}} before passing to
  // Mongo to avoid races, but since selector is guaranteed to already just be
  // an ID, we don't have to any more.
  return this.removeAsync(selector, { optimistic: true });
}
