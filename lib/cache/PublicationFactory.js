import { EJSON } from 'meteor/ejson';
import PublicationStore from './PublicationStore';
import PublicationEntry from './PublicationEntry';
import { _ } from 'meteor/underscore';
import debug from '../debug';

export default class PublicationFactory {
    constructor(name) {
        this.name = name;
        this.store = new PublicationStore(name);
        this.queue = new Meteor._SynchronousQueue();
    }

    /**
     * Potentially creates a new publicationEntry and returns the id
     *
     * @param cursors
     * @returns {string}
     */
    create(cursors) {
        let id = this.getPublicationId(cursors);
        let publicationEntry;

        if (this.store.has(id)) {
            publicationEntry = this.store.find(id);
            debug(`[PublicationFactory] Re-using existing publication "${this.name}" :: ${publicationEntry.id}`);
        } else {
            publicationEntry = new PublicationEntry(id, cursors);
            debug(`[PublicationFactory] Created new subscribers for redis for "${this.name}" :: ${publicationEntry.id}`);

            this.store.add(id, publicationEntry);
        }

        return publicationEntry;
    }

    /**
     * Pottentially destroys the observer
     *
     * @param publicationEntry
     * @param observer
     */
    removeObserver(publicationEntry, observer) {
        debug(`[PublicationFactory] Removing observer from: ${publicationEntry.id}`);

        publicationEntry.removeObserver(observer);

        if (publicationEntry.isObserversEmpty()) {
            debug(`[PublicationFactory] No other observers for: ${publicationEntry.id}. Stopping subscription to redis.`);
            publicationEntry.stop();

            this.store.remove(publicationEntry.id);
        }
    }

    /**
     * Gets an unique id based on the cursors selector and options
     * @param cursors
     * @returns {string}
     */
    getPublicationId(cursors) {
        let id = '';

        cursors.forEach(cursor => {
            const selector = cursor._cursorDescription.selector || {};
            const options = cursor._cursorDescription.options || {};

            // We do this because it can lead to a RangeError and infinite-loop caused by EJSON
            if (options.transform) {
                delete options.transform;
            }

            id += EJSON.stringify(selector) + EJSON.stringify(options);
        });

        return id;
    }
}