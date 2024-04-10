const map = {};

const constructor = Mongo.Collection;
const proto = Mongo.Collection.prototype;

const hook = function() {
    let ret = constructor.apply(this, arguments);
    map[arguments[0]] = this;
    return ret;
};

hook.__getCollectionByName = function (name) {
    if (!(name in map)) {
        return null;
    }

    const collection = map[name];

    // Use 'direct', if available, to skip all collection hooks
    if (collection.direct) {
        Object.assign(collection, collection.direct);
    }

    return collection;
};

hook.prototype = proto;
hook.prototype.constructor = hook;

for (let prop in constructor) {
    if (constructor.hasOwnProperty(prop)) {
        hook[prop] = constructor[prop];
    }
}

Mongo.Collection = hook;
Meteor.Collection = Mongo.Collection;
