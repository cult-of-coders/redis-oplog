/**
 * @param fieldsObject {Object}
 * @param searchFields {Array}
 */
export default function (fieldsObject, searchFields) {
    if (!_.isObject(fieldsObject)) {
        return false;
    }

    for (let i = 0; i < searchFields.length; i++) {
        if (fieldsObject[searchFields[i]] !== undefined) {
            return true;
        }
    }

    return false;
}