import { Meteor } from "meteor/meteor";
import { _ } from "meteor/underscore";
import docToValidate from "./docToValidate";

export default async function validatedInsert(userId, doc, generatedId) {
  // call user validators.
  // Any deny returns true means denied.
  if (
    _.any(this._validators.insert.deny, (validator) =>
      validator(userId, docToValidate(validator, doc, generatedId))
    )
  ) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (
    _.all(
      this._validators.insert.allow,
      (validator) =>
        !validator(userId, docToValidate(validator, doc, generatedId))
    )
  ) {
    throw new Meteor.Error(403, "Access denied");
  }

  // If we generated an ID above, insert it now: after the validation, but
  // before actually inserting.
  if (generatedId !== null) doc._id = generatedId;

  await this.insertAsync(doc, { optimistic: true });
}
