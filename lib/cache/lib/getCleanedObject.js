import { _ } from 'meteor/underscore';

export default (object, _fields) => {
    if (!_fields) {
        return object;
    }

    let fields = _.keys(_fields);
    //if _fields is an empty object return all fields
    if(fields.length === 0){ 
        return object
    }
    
    let builder = {};
    fields.forEach(field => {
        embed(builder, object, field);
    });

    return builder;
}

/**
 * @param target
 * @param source
 * @param field "x.x.x.x"
 */
function embed(target, source, field) {
    let parts = field.split('.');

    if (parts.length === 1) {
        if (source[field] !== undefined) {
            target[field] = source[field];
        }
    } else {
        const first = parts[0];
        if (!_.isObject(source[first])) {
            return;
        }

        target[first] = target[first] || {};
        embed(target[first], source[first], parts.slice(1).join('.'))
    }
}
