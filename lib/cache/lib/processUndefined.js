/**
 * The reason for this is to be compatible with $unset modifiers
 * Whenever you unset something, you need to send the fact that you undefined it
 *
 * This function checks each modified field, tries to split it (if nested)
 * and adds the field as undefined inside the doc, because when we fetch it from db, after $unset, the field will be empty
 *
 * @param doc
 * @param fields
 */
export default (doc, fields) => {
    fields.forEach(field => {
        process(doc, field.split('.'));
    })
}

const process = (doc, parts) => {
    if (parts.length === 1) {
        if (!(parts[0] in doc)) {
            doc[parts[0]] = undefined;
        }
    } else {
        if (parts[0] in doc) {
            if (doc[parts[0]]) {
                process(doc[parts[0]], parts.slice(-1*(parts.length - 1)))
            }
        } else {
            doc[parts[0]] = undefined;
        }
    }
};
