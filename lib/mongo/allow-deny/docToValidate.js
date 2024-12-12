import { EJSON } from "meteor/ejson";

export default function docToValidate(validator, doc, generatedId) {
  let ret = doc;
  if (validator.transform) {
    ret = EJSON.clone(doc);
    // If you set a server-side transform on your collection, then you don't get
    // to tell the difference between "client specified the ID" and "server
    // generated the ID", because transforms expect to get _id.  If you want to
    // do that check, you can do it with a specific
    // `C.allow({insert: f, transform: null})` validator.
    if (generatedId !== null) {
      ret._id = generatedId;
    }
    // TODO: should we accept async transform functions?
    ret = validator.transform(ret);
  }
  return ret;
}
