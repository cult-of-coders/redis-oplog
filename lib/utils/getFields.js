import { _ } from 'meteor/underscore';
import dot from 'dot-object';

/**
 * Taken from: https://github.com/matb33/meteor-collection-hooks/blob/master/collection-hooks.js#L198 and modified.
 * @param mutator
 */
export default function getFields(mutator) {
    // compute modified fields
    var fields = [];

    _.each(mutator, function (params, op) {
        // ====ADDED START=======================
        if (_.contains(['$set', '$unset', '$inc', '$push', '$pull', '$pop', '$rename', '$pullAll', '$addToSet', '$bit'], op)) {
            // ====ADDED END=========================
            _.each(_.keys(params), function (field) {
                // record the field we are trying to change
                if (!_.contains(fields, field)) {
                    fields.push(field)
                }
            });
            // ====ADDED START=======================
        } else {
            fields.push(op)
        }
        // ====ADDED END=========================
    });

    return fields;
};