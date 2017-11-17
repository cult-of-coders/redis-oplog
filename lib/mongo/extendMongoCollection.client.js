import {Mongo} from 'meteor/mongo';
import {LocalCollection} from 'meteor/minimongo';
import {_} from 'meteor/underscore';
import {DDP} from 'meteor/ddp-client';
import _validatedInsert from './allow-deny/validatedInsert'
import _validatedUpdate from './allow-deny/validatedUpdate'
import _validatedRemove from './allow-deny/validatedRemove'

export default () => {
    const Originals = {
        insert: Mongo.Collection.prototype.insert,
        update: Mongo.Collection.prototype.update,
        remove: Mongo.Collection.prototype.remove,
    };

    _.extend(Mongo.Collection.prototype, {
        /**
         * @param doc
         * @param optionsAndCallback
         * @returns {*}
         */
        insert(doc, ...optionsAndCallback) {
            const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array
            var options = _.clone(optionsAndCallback[0]) || {};

            // of one or zero items

            // Make sure we were passed a document to insert
            if (!doc) {
                throw new Error("insert requires an argument");
            } // Shallow-copy the document and possibly generate an ID


            doc = _.extend({}, doc);

            if ('_id' in doc) {
                if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
                    throw new Error("Meteor requires document _id fields to be non-empty strings or ObjectIDs");
                }
            } else {
                let generateId = true; // Don't generate the id if we're the client and the 'outermost' call
                // This optimization saves us passing both the randomSeed and the id
                // Passing both is redundant.

                if (this._isRemoteCollection()) {
                    const enclosing = DDP._CurrentMethodInvocation.get();

                    if (!enclosing) {
                        generateId = false;
                    }
                }

                if (generateId) {
                    doc._id = this._makeNewID();
                }
            } // On inserts, always return the id that we generated; on all other
            // operations, just return the result from the collection.


            var chooseReturnValueFromCollectionResult = function (result) {
                if (doc._id) {
                    return doc._id;
                } // XXX what is this for??
                // It's some iteraction between the callback to _callMutatorMethod and
                // the return value conversion


                doc._id = result;
                return result;
            };

            const wrappedCallback = wrapCallback(callback, chooseReturnValueFromCollectionResult);

            if (this._isRemoteCollection()) {
                console.log(doc, options);
                const result = this._callMutatorMethod("insert", [doc, options], wrappedCallback);

                return chooseReturnValueFromCollectionResult(result);
            }
            // it's my collection.  descend into the collection object
            // and propagate any exception.


            try {
                // If the user provided a callback and the collection implements this
                // operation asynchronously, then queryRet will be undefined, and the
                // result will be returned through the callback instead.
                const result = this._collection.insert(doc, wrappedCallback);

                return chooseReturnValueFromCollectionResult(result);
            } catch (e) {
                if (callback) {
                    callback(e);
                    return null;
                }

                throw e;
            }
        },

        /**
         * @param selector
         * @param modifier
         * @param optionsAndCallback
         * @returns {*}
         */
        update(selector, modifier, ...optionsAndCallback) {
            const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array

            var options = _.clone(optionsAndCallback[0]) || {};
            // of one or zero items

            let insertedId;

            if (options && options.upsert) {
                // set `insertedId` if absent.  `insertedId` is a Meteor extension.
                if (options.insertedId) {
                    if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error("insertedId must be string or ObjectID");
                    insertedId = options.insertedId;
                } else if (!selector || !selector._id) {
                    insertedId = this._makeNewID();
                    options.generatedId = true;
                    options.insertedId = insertedId;
                }
            }

            selector = Mongo.Collection._rewriteSelector(selector, {
                fallbackId: insertedId
            });
            const wrappedCallback = wrapCallback(callback);

            if (this._isRemoteCollection()) {
                const args = [selector, modifier, options];
                return this._callMutatorMethod("update", args, wrappedCallback);
            } // it's my collection.  descend into the collection object
            // and propagate any exception.


            try {
                // If the user provided a callback and the collection implements this
                // operation asynchronously, then queryRet will be undefined, and the
                // result will be returned through the callback instead.
                return this._collection.update(selector, modifier, options, wrappedCallback);
            } catch (e) {
                if (callback) {
                    callback(e);
                    return null;
                }

                throw e;
            }
        },

        /**
         * @param selector
         * @param optionsAndCallback
         * @returns {*}
         */
        remove(selector, ...optionsAndCallback) {
            const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array
            let options = _.clone(optionsAndCallback[0]) || {};

            if (_.isString(selector)) {
                selector = {_id: selector}
            }

            selector = Mongo.Collection._rewriteSelector(selector);
            const wrappedCallback = wrapCallback(callback);

            if (this._isRemoteCollection()) {
                return this._callMutatorMethod("remove", [selector, options], wrappedCallback);
            } // it's my collection.  descend into the collection object
            // and propagate any exception.


            try {
                // If the user provided a callback and the collection implements this
                // operation asynchronously, then queryRet will be undefined, and the
                // result will be returned through the callback instead.
                return this._collection.remove(selector, wrappedCallback);
            } catch (e) {
                if (callback) {
                    callback(e);
                    return null;
                }

                throw e;
            }
        },

        _validatedInsert,
        _validatedUpdate,
        _validatedRemove
    });

    const LocalCollectionOriginals = {
        insert: LocalCollection.prototype.insert,
        remove: LocalCollection.prototype.remove,
    };

    _.extend(LocalCollection.prototype, {
        insert(doc, ...optionsAndCallback) {
            const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array
            const options = _.clone(optionsAndCallback[0]) || {};

            LocalCollectionOriginals.insert.call(this, doc, callback);
        },
        remove(doc, ...optionsAndCallback) {
            const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array
            const options = _.clone(optionsAndCallback[0]) || {};

            LocalCollectionOriginals.remove.call(this, doc, callback);
        }
    });
}

function wrapCallback(callback, convertResult) {
    if (!callback) {
        return;
    } // If no convert function was passed in, just use a "blank function"


    convertResult = convertResult || _.identity;
    return (error, result) => {
        callback(error, !error && convertResult(result));
    };
}

function popCallbackFromArgs(args) {
    // Pull off any callback (or perhaps a 'callback' variable that was passed
    // in undefined, like how 'upsert' does it).
    if (args.length && (args[args.length - 1] === undefined || args[args.length - 1] instanceof Function)) {
        return args.pop();
    }
}