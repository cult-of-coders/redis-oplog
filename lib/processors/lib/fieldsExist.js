import { _ } from 'meteor/underscore';

/**
 * @param fieldsObject {Object}
 * @param searchFields {Array}
 */
export default function (fieldsObject, searchFields) {
    if (!fieldsObject) {
        return true;
    }

    const fields = _.keys(fieldsObject);

    if (!fields.length) {
        return true;
    }

    // detect if fields are { field: 0 } or { field: 1 }
    let positive = true;
    if (!fieldsObject[fields[0]]) {
        positive = false
    }

    if (positive) {
        for (let i = 0; i < searchFields.length; i++) {
            if (fieldsObject[searchFields[i]]) {
                return true;
            }
        }
    } else {
        for (let i = 0; i < searchFields.length; i++) {
            if (!fieldsObject[searchFields[i]]) {
                return true;
            }
        }
    }

    return false;
}