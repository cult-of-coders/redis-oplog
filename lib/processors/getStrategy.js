import { Strategy } from '../constants';
import { _ } from 'meteor/underscore';

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

  if (selector && selector._id && _.keys(selector) === 1) {
    const { _id } = selector;

    if (typeof _id === 'string') return Strategy.DEDICATED_CHANNELS;

    const idOperators = typeof _id === 'object' ? _.keys(_id) : [];
    if(idOperators.length === 1 && idOperators[0] === '$in') return Strategy.DEDICATED_CHANNELS;
  }

  return Strategy.DEFAULT;
}
