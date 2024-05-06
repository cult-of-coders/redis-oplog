import { _ } from "meteor/underscore";

export default function (selector) {
  const filter = selector._id;
  let ids = [];

  if (_.isObject(filter) && !filter._str) {
    if (!filter.$in) {
      throw new Meteor.Error(
        `When you subscribe directly, you can't have other specified fields rather than $in`
      );
    }

    ids = filter.$in;
  } else {
    ids.push(filter);
  }

  return ids;
}
