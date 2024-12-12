import { Strategy } from "../constants";

/**
 * @param selector
 * @param options
 * @returns {*}
 */
export default function getStrategy(selector = {}, options = {}) {
  if (options.limit && !options.sort) {
    options.sort = { _id: 1 };
    // throw new Meteor.Error(`Sorry, but you are not allowed to use "limit" without "sort" option.`);
  }

  if (options.limit && options.sort) {
    return Strategy.LIMIT_SORT;
  }

  if (selector && selector._id) {
    return Strategy.DEDICATED_CHANNELS;
  }

  return Strategy.DEFAULT;
}
