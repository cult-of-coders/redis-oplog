function getFieldsOfInterestFromAll(subscribers) {
	let allFields = [];

	for (let i = 0; i < subscribers.length; i++) {
		const subscriber = subscribers[i];
		const fields = subscriber.getFieldsOfInterest();

		if (fields === true) {
			// end of story, there is an observableCollection that needs all fields
			// therefore we will query for all fields
			return true;
		}

		allFields = _.union(allFields, fields);

	}

	// this should not happen, but as a measure of safety
	if (allFields.length === 0)
		return true;

	allFields = removeChildrenOfParents(allFields);

	const fieldsObject = {};

	allFields.forEach(field => {
		fieldsObject[field] = 1;
	});

	return fieldsObject;
}

/**
 * @param {array} array
 * @return {array} array
 */
export function removeChildrenOfParents(array) {
	const freshArray = [];

	array.forEach((element, idxe) => {
		// add it to freshArray only if there's no field starting with {me} + '.' inside the array
		const foundParent = array.find((subelement, idxs) => {
			return idxe !== idxs && element.indexOf(`${subelement}.`) === 0;
		});

		if (!foundParent)
			freshArray.push(element);

	});

	return freshArray;
}

export default getFieldsOfInterestFromAll;
