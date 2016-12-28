import { _ } from 'meteor/underscore';

export default (fields) => {
    let topLevelFields = {};

    _.each(fields, (value, fieldName) => {
        if (fieldName.indexOf('.') !== -1) {
            // topLevelFields[]
        }
    })
}