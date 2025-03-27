export default function transformDoc(validator, doc) {
  if (validator.transform) return validator.transform(doc);
  return doc;
}
