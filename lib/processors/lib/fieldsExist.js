import { _ } from 'meteor/underscore';

/**
 * @param observableCollection {Object}
 * @param searchFields {Array}
 */
export default function (observableCollection, searchFields) {
    if (!observableCollection.options.fields) {
        return true;
    }

    if (!observableCollection.fieldsArray.length) {
        return true;
    }

    const fieldsObject = observableCollection.options.fields;

    if (!observableCollection.isFieldsProjectionByExclusion) {
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