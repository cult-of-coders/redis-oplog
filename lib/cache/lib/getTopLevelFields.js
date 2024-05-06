function getTopLevelFields(fields) {
  let topLevel = [];

  fields.forEach((field) => {
    topLevel.push(field.split(".")[0]);
  });

  return topLevel;
}

export default getTopLevelFields;
