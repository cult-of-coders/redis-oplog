import { Strategy } from '../constants';

import defaultStrategy from './default';
import directStrategy from './direct';
import limitSortStrategy from './limit-sort';

const StrategyProcessorMap = {
    [Strategy.LIMIT_SORT]: limitSortStrategy,
    [Strategy.DEFAULT]: defaultStrategy,
    [Strategy.DEDICATED_CHANNELS]: directStrategy
};

/**
 * @returns {string}
 */
export function getStrategy(selector, options) {
    if (options.limit && !options.sort) {
        throw new Meteor.Error(`Sorry, but you are not allowed to use "limit" without "sort" option.`);
    }

    if (options.limit && options.sort) {
        return Strategy.LIMIT_SORT;
    }

    if (selector && selector._id && _.keys(selector).length === 1) {
        return Strategy.DEDICATED_CHANNELS;
    }

    return Strategy.DEFAULT;
}

/**
 * @param strategy
 * @returns {*}
 */
export function getProcessor(strategy) {
    return StrategyProcessorMap[strategy];
}