export default function maybeWrapCallback(callback, fn) {
  if (!callback) return
  return (...args) => {
    fn(...args)
    return callback(...args)
  }
}
