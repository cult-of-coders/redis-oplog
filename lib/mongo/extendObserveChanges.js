import PublicationEntry from '../cache/PublicationEntry';
import PublicationFactory from '../cache/PublicationFactory';
import { diff } from 'deep-diff';
import {EJSON} from 'meteor/ejson';

export default function (cursor, selector, options) {
    if (options && options.disableOplog) {
        return;
    }

    if (!cursor._cursorDescription) {
        return null;
    }

    const collection = Mongo.Collection.get(cursor._cursorDescription.collectionName);

    Object.assign(cursor, {
        observeChanges(_observer) {
            return createPublicationEntry(
                cursor,
                createObserveChanges(_observer, collection)
            );
        },
        observe(_observer) {
            return createPublicationEntry(
                cursor,
                createObserve(_observer, collection)
            );
        }
    });
}

/**
 * Creates the publication entry
 * @param cursor
 * @param observer
 * @returns {{stop: (function()), _multiplexer: {}}}
 */
function createPublicationEntry(cursor, observer) {
    let pe = PublicationFactory.create(cursor, observer);

    return {
        stop() {
            pe.removeObserver(observer);
        },
        // We do this to make it work with meteorhacks:kadira
        _multiplexer: class {
            _sendAdds() {}
        }
    }
}

function createDoc(doc, collection) {
    if (collection._transform) {
        return collection._transform(EJSON.clone(doc));
    }

    return EJSON.clone(doc);
}

/**
 * @param observer
 * @param {Mongo.Collection} collection
 */
function createObserve(observer, collection) {
    const ef = function() {};

    return {
        connection: observer.connection,
        added(collectionName, docId, doc) {
            if (observer.added) {
                observer.added(createDoc(doc, collection));
            }
        },
        changed(collectionName, docId, changedDiff, newDoc, oldDoc) {
            if (observer.changed) {
                var differences = diff(newDoc, oldDoc);

                if (differences) {
                    observer.changed(createDoc(newDoc, collection), oldDoc)
                }
            }
        },
        removed(collectionName, docId, doc) {
            if (observer.removed) {
                observer.removed(doc)
            }
        }
    }
}

/**
 * @param observer
 * @param {Mongo.Collection} collection
 */
function createObserveChanges(observer, collection) {
    const ef = function() {};

    return {
        connection: observer.connection,
        added(collectionName, docId, doc) {
            if (observer.added) {
                observer.added(docId, createDoc(doc, collection));
            }
        },
        changed(collectionName, docId, doc) {
            if (observer.changed) {
                observer.changed(docId, createDoc(doc, collection));
            }
        },
        removed(collectionName, docId) {
            if (observer.removed) {
                observer.removed(docId);
            }
        }
    }
}
