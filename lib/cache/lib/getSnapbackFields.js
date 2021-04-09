export default (doc, fields) => {
	const snapbacks = [];

	fields.forEach(field => {
		if (field.indexOf('.') !== -1) {
			const parts = field.split('.');

			parts.pop();

			if (isArray(doc, parts))
				snapbacks.push(parts.join('.'));

		}
	});

	return snapbacks;
};

const isArray = (doc, parts) => {
	if (parts.length > 1)
		return isArray(doc[parts[0]], parts.slice(1));

	return _.isArray(doc[parts[0]]);

};
