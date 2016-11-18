import { _ } from 'meteor/underscore';

/**
 * Deep extending
 *
 * @param left
 * @param right
 */
export default function deepExtend(left, right) {
    _.each(right, (rightValue, key) => {
        if (left[key]) {
            if (_.isArray(rightValue) || rightValue instanceof Date) {
                left[key] = rightValue;
            } else if (_.isObject(rightValue)) {
                if (_.isArray(left[key])) {
                    left[key] = rightValue;
                } else if (_.isObject(left[key])) {
                    deepExtend(left[key], rightValue);
                } else {
                    left[key] = rightValue;
                }
            } else {
                left[key] = rightValue;
            }
        } else {
            left[key] = rightValue;
        }
    })
}