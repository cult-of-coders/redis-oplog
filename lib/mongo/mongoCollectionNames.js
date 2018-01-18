let map = {};

export function getName(name) {
    return map[name];
}

function extend(base, sub) {
    // Avoid instantiating the base class just to setup inheritance
    // Also, do a recursive merge of two prototypes, so we don't overwrite 
    // the existing prototype, but still maintain the inheritance chain
    // Thanks to @ccnokes
    var origProto = sub.prototype;
    sub.prototype = Object.create(base.prototype);
    for (var key in origProto)  {
       sub.prototype[key] = origProto[key];
    }
    // The constructor property was set wrong, let's fix it
    Object.defineProperty(sub.prototype, 'constructor', { 
      enumerable: false, 
      value: sub 
    });
  }
  

const old = Mongo.Collection;

function extension(name, ...args) {
    old.call(this, name, ...args);
    map[name] = this;
}


_.extend(extension, old);
extend(old, extension);

Mongo.Collection = extension;
Mongo.Collection.get = getName;