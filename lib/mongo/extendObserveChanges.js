import PublicationEntry from '../cache/PublicationEntry';
import PublicationFactory from '../cache/PublicationFactory';

export default function (cursor, selector, options) {
    if (options && options.disableOplog) {
        return;
    }

    if (!cursor._cursorDescription) {
        return null;
    }

    const collection = Mongo.Collection.get(cursor._cursorDescription.collectionName);

    const create = function(observer) {
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
    };

    cursor.observeChanges = function(_observer) {
        let observer = createObserveChanges(_observer);

        return create(observer);
    };

    cursor.observe = function(_observer) {
        let observer = createObserve(_observer);

        return create(observer);
    };
}

/**
 * @param observer
 * @param collection
 */
function createObserve(observer) {
    const ef = function() {};

    return {
        added(collectionName, docId, doc) {
            if (observer.added) {
                observer.added(doc);
            }
        },
        changed(collectionName, docId, changedDiff, newDoc, oldDoc) {
            if (observer.changed) {
                observer.changed(
                    newDoc,
                    oldDoc
                )
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
        added(collectionName, docId, doc) {
            if (observer.added) {
                observer.added(docId, doc);
            }
        },
        changed(collectionName, docId, doc) {
            if (observer.changed) {
                observer.changed(docId, doc);
            }
        },
        removed(collectionName, docId) {
            if (observer.removed) {
                observer.removed(docId);
            }
        }
    }
}
