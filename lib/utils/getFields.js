import { _ } from 'meteor/underscore';

/**
 * Taken from: https://github.com/matb33/meteor-collection-hooks/blob/master/collection-hooks.js#L198 and modified.
 * @param mutator
 */
export default function getFields(mutator) {
    // compute modified fields
    var fields = [];
    var fieldsOptions = {};

    _.each(mutator, function (params, op) {
        // ====ADDED START=======================
        if (_.contains(['$set', '$unset', '$inc', '$push', '$pull', '$pop', '$rename', '$pullAll', '$addToSet', '$bit'], op)) {
            // ====ADDED END=========================
            _.each(_.keys(params), function (field) {
                // record the field we are trying to change
                if (!_.contains(fields, field)) {
                    if (field.indexOf('.$.') === -1) {
                        fields.push(field);
                        fieldsOptions[field] = 1;
                    } else {
                        field = field.replace('.$.', '.');
                        fieldsOptions[field.split('.')[0]] = 1;
                        fields.push(field);
                    }
                }
            });
            // ====ADDED START=======================
        } else {
            fields.push(op)
        }
        // ====ADDED END=========================
    });

    return {fields, fieldsOptions};
};