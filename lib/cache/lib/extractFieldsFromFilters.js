const deepFilterFieldsArray = ['$and', '$or', '$nor'];
const deepFilterFieldsObject = ['$not'];

/**
 * Given a complex filtering option, extract the fields
 * @param filters
 */
function extractFieldsFromFilters(filters) {
	const filterFields = [];

	_.each(filters, (value, field) => {
		if (field[0] !== '$')
			filterFields.push(field);

	});

	deepFilterFieldsArray.forEach(field => {
		if (filters[field]) {
			filters[field].forEach(element => {
				_.union(filterFields, extractFieldsFromFilters(element));
			});
		}
	});

	deepFilterFieldsObject.forEach(field => {
		if (filters[field])
			_.union(filterFields, extractFieldsFromFilters(filters[field]));

	});

	return filterFields;
}

export default extractFieldsFromFilters;
