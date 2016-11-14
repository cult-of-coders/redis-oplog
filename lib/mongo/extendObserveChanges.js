import PublicationEntry from '../cache/PublicationEntry';

export default function (cursor, selector, options) {
    if (options && options.disableOplog) {
        return;
    }

    if (!cursor.__cursorDescriptor) {
        return null;
    }

    const collection = Mongo.Collection.get(cursor.__cursorDescriptor.collectionName);

    const create = function(observer) {
        const pe = new PublicationEntry(null, [cursor]);
        pe.addObserver(observer);

        return {
            stop() {
                pe.stop();
            }
        }
    };

    cursor.observeChanges = function(_observer) {
        let observer = createObserveChanges(_observer);

        return create(observer);
    };

    cursor.observeChanges = function(_observer) {
        let observer = createObserve(_observer, collection);

        return create(observer);
    };
}

/**
 * @param observer
 * @param collection
 */
function createObserve(observer, collection) {
    const ef = function() {};

    return {
        added(collectionName, doc) {
            if (observer.added) {
                observer.added(doc);
            }
        },
        changed(collectionName, _id, doc) {
            if (observer.changed) {
                observer.changed(
                    collection.findOne(_id)
                )
            }
        },
        removed(collectionName, docId) {
            if (observer.removed) {
                observer.removed({_id: docId})
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
        added(collectionName, doc) {
            if (observer.added) {
                observer.added(doc);
            }
        },
        changed(collectionName, _id, doc) {
            if (observer.changed) {
                observer.changed(doc);
            }
        },
        removed(collectionName, docId) {
            if (observer.removed) {
                observer.removed({_id: docId})
            }
        }
    }
}
