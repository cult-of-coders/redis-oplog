import { _ } from 'meteor/underscore';

/**
 * @param fieldsObject {Object}
 * @param searchFields {Array}
 */
export default function (fieldsObject, searchFields) {
    if (!fieldsObject) {
        return true;
    }

    for (let i = 0; i < searchFields.length; i++) {
        if (fieldsObject[searchFields[i]]) {
            return true;
        }
    }

    return false;
}