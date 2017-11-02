function getFieldsOfInterestFromAll(subscribers) {
    let allFields = [];
    for (let i = 0; i < subscribers.length; i++) {
        const subscriber = subscribers[i];
        let fields = subscriber.getFieldsOfInterest();

        if (fields === true) {
            // end of story, there is an observableCollection that needs all fields
            // therefore we will query for all fields
            return true;
        } else {
            allFields = _.union(allFields, fields);
        }
    }

    // this should not happen, but as a measure of safety
    if (allFields.length === 0) {
        return true;
    }

    let fieldsObject = {};

    allFields.forEach(field => {
        fieldsObject[field] = 1;
    });

    return fieldsObject;
}

export default getFieldsOfInterestFromAll;