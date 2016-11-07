/**
 * Deep extending
 *
 * @param left
 * @param right
 */
export default function deepExtend(left, right) {
    _.each(right, (rightValue, key) => {
        if (left[key]) {
            if (_.isObject(left[key]) && _.isObject(rightValue)) {
                deepExtend(left[key], rightValue);
            } else {
                left[key] = rightValue;
            }
        } else {
            left[key] = rightValue;
        }
    })
}