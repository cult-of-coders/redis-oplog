/**
 * Taken from: https://github.com/Meteor-Community-Packages/meteor-collection-hooks/blob/master/collection-hooks.js#L194 and modified.
 * @param mutator
 */
export default function getFields(mutator) {
  // compute modified fields
  var fields = [];
  var topLevelFields = [];

  Object.entries(mutator).forEach(function ([op, params]) {
    if (op[0] == "$") {
      Object.keys(params).forEach(function (field) {
        // record the field we are trying to change
        if (!fields.includes(field)) {
          // fields.push(field);
          // topLevelFields.push(field.split('.')[0]);

          // like { $set: { 'array.1.xx' } }
          const specificPositionFieldMatch = /\.[\d]+(\.)?/.exec(field);
          if (specificPositionFieldMatch) {
            fields.push(field.slice(0, specificPositionFieldMatch.index));
          } else {
            if (field.indexOf(".$") !== -1) {
              if (field.indexOf(".$.") !== -1) {
                fields.push(field.split(".$.")[0]);
              } else {
                fields.push(field.split(".$")[0]);
              }
            } else {
              fields.push(field);
            }
          }

          topLevelFields.push(field.split(".")[0]);
        }
      });
    } else {
      fields.push(op);
    }
  });

  return { fields, topLevelFields };
}
