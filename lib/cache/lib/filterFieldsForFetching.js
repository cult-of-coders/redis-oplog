/**
 * @param allowedFields Array<String>
 * @param modifiedFields Array<String>
 */
function filterAllowedFields(allowedFields, modifiedFields) {
  let builder = { _id: 1 };

  modifiedFields.forEach((modifiedField) => {
    for (let i = 0; i < allowedFields.length; i++) {
      const allowedField = allowedFields[i];

      // this should treat the case where modifiedField is a nest of allowedField like:
      // modifiedField: 'profile.firstName'
      // allowedField: 'profile'
      // => modifiedField goes to builder
      if (
        modifiedField === allowedField ||
        modifiedField.indexOf(allowedField + ".") !== -1
      ) {
        builder[modifiedField] = 1;
        return;
      }

      // it should also treat the following case:
      // modifiedField: 'address'
      // allowedField: 'address.city'
      // => allowedField goes to builder
      if (allowedField.indexOf(modifiedField + ".") !== -1) {
        builder[allowedField] = 1;
        return;
      }
    }
  });

  return builder;
}

function filterDisallowedFields(disallowedFields, modifiedFields) {
  let builder = { _id: 1 };

  modifiedFields.forEach((modifiedField) => {
    let isAllowed = true;
    for (let i = 0; i < disallowedFields.length; i++) {
      const disallowedField = disallowedFields[i];

      if (modifiedField === disallowedField) {
        isAllowed = false;
        break;
      }

      // modifiedField: profile
      // disallowedField: profile.firstName
      // => profile: 1, and field reprojection LocalCollection._
      // break
      if (disallowedField.indexOf(modifiedField + ".") !== -1) {
        isAllowed = false;
        builder[modifiedField] = 1;
      }

      // modifiedField: address.city
      // disallowedField: address
      // isAllowed => false
      // break
      if (modifiedField.indexOf(disallowedField + ".") !== -1) {
        isAllowed = false;
        break;
      }
    }

    if (isAllowed) {
      builder[modifiedField] = 1;
    }
  });

  return builder;
}

export { filterAllowedFields, filterDisallowedFields };
