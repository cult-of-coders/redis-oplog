export default function isRemovedNonExistent(e) {
  return e.toString().indexOf("Removed nonexistent document") !== -1;
}
