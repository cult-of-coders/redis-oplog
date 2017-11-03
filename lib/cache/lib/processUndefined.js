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

