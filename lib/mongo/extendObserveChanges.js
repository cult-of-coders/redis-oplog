import PublicationEntry from '../cache/PublicationEntry';
import PublicationFactory from '../cache/PublicationFactory';
import { diff } from 'deep-diff';
import {EJSON} from 'meteor/ejson';

export default function (cursor, selector, options) {
    if (options && options.disableOplog) {
        return;
    }

    if (!cursor._cursorDescription) {
        console.warn('This cursor does not have a _cursorDescription field. Observe changes will work unex');
        return null;
    }

    Object.assign(cursor, {
        observeChanges(_observer) {
            return createPublicationEntry(
                cursor,
                createObserveChanges(_observer)
            );
        },
        observe(_observer) {
            return createPublicationEntry(
                cursor,
                createObserve(_observer)
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

/**
 * @param observer
 */
function createObserve(observer) {
    const ef = function() {};

    return {
        connection: observer.connection,
        added(collectionName, docId, doc) {
            if (observer.added) {
                observer.added(EJSON.clone(doc));
            }
        },
        changed(collectionName, docId, changedDiff, newDoc, oldDoc) {
            if (observer.changed) {
                var differences = diff(newDoc, oldDoc);

                if (differences) {
                    observer.changed(EJSON.clone(newDoc), oldDoc)
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
 */
function createObserveChanges(observer) {
    const ef = function() {};

    return {
        connection: observer.connection,
        added(collectionName, docId, doc) {
            if (observer.added) {
                observer.added(docId, EJSON.clone(doc));
            }
        },
        changed(collectionName, docId, doc) {
            if (observer.changed) {
                observer.changed(docId, EJSON.clone(doc));
            }
        },
        removed(collectionName, docId) {
            if (observer.removed) {
                observer.removed(docId);
            }
        }
    }
}
