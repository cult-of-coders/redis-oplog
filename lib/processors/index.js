import { Strategy } from "../constants";

import defaultStrategy from "./default";
import directStrategy from "./direct";
import limitSortStrategy from "./limit-sort";
import getStrategy from "./getStrategy";

const StrategyProcessorMap = {
  [Strategy.LIMIT_SORT]: limitSortStrategy,
  [Strategy.DEFAULT]: defaultStrategy,
  [Strategy.DEDICATED_CHANNELS]: directStrategy,
};

export { getStrategy };

/**
 * @param strategy
 * @returns {*}
 */
export function getProcessor(strategy) {
  return StrategyProcessorMap[strategy];
}
