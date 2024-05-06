const map = {};

const constructor = Mongo.Collection;
const proto = Mongo.Collection.prototype;

const hook = function () {
  let ret = constructor.apply(this, arguments);
  map[arguments[0]] = this;
  return ret;
};

hook.__getCollectionByName = function (name) {
  return map[name];
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
