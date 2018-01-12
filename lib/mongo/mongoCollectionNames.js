let map = {};

export function getName(name) {
    return map[name];
}

const old = Mongo.Collection;

const newCollection = class extends Mongo.Collection {
    constructor(name, ...args) {
        super(name, ...args);
        
        map[name] = this;
    }
}

Mongo.Collection = newCollection;
Mongo.Collection.get = getName;