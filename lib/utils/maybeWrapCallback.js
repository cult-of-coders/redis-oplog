/**
 * Function is used to wrap the callback function from a mutation if it exists
 *
 * @param callback
 * @param fn
 * @return {function(...[*])}
 */
export default function maybeWrapCallback(callback, fn) {
	if (!callback) return;

	return (...args) => {
		fn(...args);

		return callback(...args);
	};
}
