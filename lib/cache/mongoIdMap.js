import { MongoID } from "meteor/mongo-id";

export class MongoIDMap {
  constructor(idStringify, idParse) {
    this._internal = new Map();
    this._idStringify = idStringify || MongoID.idStringify;
    this._idParse = idParse || MongoID.idParse;
  }

  get(id) {
    const key = this._idStringify(id);
    return this._internal.get(key);
  }

  pop(id) {
    const key = this._idStringify(id);
    const ret = this._internal.get(key);
    this._internal.delete(key);
    return ret;
  }

  set(id, value) {
    const key = this._idStringify(id);
    this._internal.set(key, value);
  }

  setDefault(id, def) {
    const key = this._idStringify(id);
    if (this._internal.has(key)) {
      return this._internal.get(key);
    }
    this._internal.set(key, def);
    return def;
  }

  remove(id) {
    const key = this._idStringify(id);
    this._internal.delete(key);
  }

  has(id) {
    const key = this._idStringify(id);
    return this._internal.has(key);
  }

  size() {
    return this._internal.size;
  }

  empty() {
    return this._internal.size === 0;
  }

  clear() {
    this._internal.clear();
  }

  keys() {
    return Array.from(this._internal.keys()).map((key) => this._idParse(key));
  }

  forEach(iterator) {
    this._internal.forEach((value, key) => {
      iterator.call(null, value, this._idParse(key));
    });
  }

  async compareWith(other, callbacks) {
    // operate on the _internal maps to avoid overhead of parsing id's.
    const leftMap = this._internal;
    const rightMap = other._internal;

    for (const [key, leftValue] of leftMap) {
      const rightValue = rightMap.get(key);
      if (rightValue != null)
        callbacks.both &&
          (await callbacks.both(this._idParse(key), leftValue, rightValue));
      else
        callbacks.leftOnly &&
          (await callbacks.leftOnly(this._idParse(key), leftValue));
    }

    if (callbacks.rightOnly) {
      for (const [key, rightValue] of rightMap) {
        if (!leftMap.has(key))
          await callbacks.rightOnly(this._idParse(key), rightValue);
      }
    }
  }
}
