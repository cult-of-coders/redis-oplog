import { _ } from 'meteor/underscore';

/**
 * Taken from: https://github.com/matb33/meteor-collection-hooks/blob/master/collection-hooks.js#L198 and modified.
 * @param mutator
 */
export default function getFields(mutator) {
	// compute modified fields
	var fields = [];
	var topLevelFields = [];

	_.each(mutator, function (params, op) {
		if (op[0] == '$') {
			_.each(_.keys(params), function (field) {
				// record the field we are trying to change
				if (!_.contains(fields, field)) {
					// fields.push(field);
					// topLevelFields.push(field.split('.')[0]);

					// like { $set: { 'array.1.xx' } }
					const specificPositionFieldMatch = (/\.[\d]+(\.)?/).exec(field);

					if (specificPositionFieldMatch)
						fields.push(field.slice(0, specificPositionFieldMatch.index));
					else {
						if (field.indexOf('.$') !== -1) {
							if (field.indexOf('.$.') !== -1)
								fields.push(field.split('.$.')[0]);
							else
								fields.push(field.split('.$')[0]);

						} else
							fields.push(field);

					}

					topLevelFields.push(field.split('.')[0]);
				}
			});
		} else
			fields.push(op);

	});

	return { fields, topLevelFields };
}
