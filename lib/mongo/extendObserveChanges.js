import PublicationEntry from '../cache/PublicationEntry';
import PublicationFactory from '../cache/PublicationFactory';
import { diff } from 'deep-diff';
import cloneDeep from 'lodash.clonedeep';
import { DDP } from 'meteor/ddp';
import isRemovedNonExistent from '../utils/isRemovedNonExistent';
import { Mongo, MongoInternals } from 'meteor/mongo';
import { LocalCollection } from 'meteor/minimongo';
import { Random } from 'meteor/random';

export default function() {
    var coll = new Mongo.Collection('__dummy_coll_' + Random.id());
    const cursor = coll.find();

    let CursorPrototype = cursor.constructor;

    CursorPrototype.prototype.observeChanges = function(callbacks) {
        return createPublicationEntry(this, createObserveChanges(callbacks));
    };
    CursorPrototype.prototype.observe = function(callbacks) {
        return createPublicationEntry(this, createObserve(callbacks));
    };
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
        },
    };
}

/**
 * @param observer
 */
function createObserve(observer) {
    const ef = function() {};

    return {
        connection: getObserverConnection(observer),
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
                try {
                    observer.removed(doc);
                } catch (e) {
                    if (!isRemovedNonExistent(e)) {
                        throw e;
                    }
                }
            }
        },
    };
}

/**
 * @param observer
 */
function createObserveChanges(observer) {
    const ef = function() {};

    return {
        connection: getObserverConnection(observer),
        added(collectionName, docId, doc) {
            if (observer.added) {
                observer.added(docId, cloneDeep(doc));
            }
        },
        changed(collectionName, docId, doc) {
            if (observer.changed) {
                observer.changed(docId, cloneDeep(doc));
            }
        },
        removed(collectionName, docId) {
            if (observer.removed) {
                try {
                    observer.removed(docId);
                } catch (e) {
                    if (!isRemovedNonExistent(e)) {
                        throw e;
                    }
                }
            }
        },
    };
}

/**
 * @param {*} observer
 */
function getObserverConnection(observer) {
    if (observer.connection) {
        return observer.connection;
    }

    const currentPublishInvoke =
        DDP._CurrentPublicationInvocation &&
        DDP._CurrentPublicationInvocation.get();

    if (currentPublishInvoke) {
        return currentPublishInvoke.connection;
    }
}
