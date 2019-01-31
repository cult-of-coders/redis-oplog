import PublicationEntry from "../cache/PublicationEntry";
import PublicationFactory from "../cache/PublicationFactory";
import { diff } from "deep-diff";
import cloneDeep from "lodash.clonedeep";
import { DDP } from "meteor/ddp";

export default function(cursor, selector, options) {
    if (options && options.disableOplog) {
        return;
    }

    if (!cursor._cursorDescription) {
        // It means that it's most likely a LocalCollection, no need to extend it in any way
        return;
    }

    Object.assign(cursor, {
        observeChanges(_observer) {
            return createPublicationEntry(
                cursor,
                createObserveChanges(_observer)
            );
        },
        observe(_observer) {
            return createPublicationEntry(cursor, createObserve(_observer));
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
    };
}

/**
 * @param observer
 */
function createObserve(observer) {
    const ef = function() {};

    return {
        connection: getObserverConnection(observer),
        movedBefore(collectionName, docId, beforeId) {
          if (observer.movedBefore) {
            observer.movedBefore(docId, beforeId);
          }
        },
        added(collectionName, docId, doc) {
            if (observer.added) {
                observer.added(cloneDeep(doc));
            }
        },
        changed(collectionName, docId, changedDiff, newDoc, oldDoc) {
            if (observer.changed) {
                var differences = diff(newDoc, oldDoc);

                if (differences) {
                    observer.changed(cloneDeep(newDoc), oldDoc);
                }
            }
        },
        removed(collectionName, docId, doc) {
            if (observer.removed) {
                observer.removed(doc);
            }
        }
    };
}

/**
 * @param observer
 */
function createObserveChanges(observer) {
    const ef = function() {};

    return {
        connection: getObserverConnection(observer),
        movedBefore(collectionName, docId, beforeId) {
          if (observer.movedBefore) {
            observer.movedBefore(docId, beforeId);
          }
        },
        added(collectionName, docId, doc, beforeId) {
          const clonedDoc = cloneDeep(doc);
            if (observer.added) {
                observer.added(docId, clonedDoc);
            }
            if (observer.addedBefore) {
              observer.addedBefore(docId, clonedDoc, beforeId);
            }
        },
        changed(collectionName, docId, doc) {
            if (observer.changed) {
                observer.changed(docId, cloneDeep(doc));
            }
        },
        removed(collectionName, docId) {
            if (observer.removed) {
                observer.removed(docId);
            }
        }
    };
}

/**
 * @param {*} observer
 */
function getObserverConnection(observer) {
    if (observer.connection) {
        return observer.connection;
    }

    const currentPublishInvoke = DDP._CurrentPublicationInvocation && DDP._CurrentPublicationInvocation.get();

    if (currentPublishInvoke) {
        return currentPublishInvoke.connection;
    }
}
