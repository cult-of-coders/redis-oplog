import { EJSON } from 'meteor/ejson';
import PublicationStore from './PublicationStore';
import PublicationEntry from './PublicationEntry';
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
     * @param id
     * @param cursors
     * @param channels
     * @returns {string}
     */
    create(id, cursors, channels) {
        let publicationEntry;

        if (this.store.has(id)) {
            publicationEntry = this.store.find(id);
            debug(`Re-using existing publication "${this.name}"::${publicationEntry.id}`);
        } else {
            publicationEntry = new PublicationEntry(id, cursors, channels);
            debug(`Created new subscribers for redis for "${this.name}"::${publicationEntry.id}`);

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
        debug(`Removing observer from: ${publicationEntry.id}`);

        publicationEntry.removeObserver(observer);

        if (publicationEntry.isObserversEmpty()) {
            debug(`No other observers for: ${publicationEntry.id}. Stopping subscription to redis.`);
            publicationEntry.stop();

            this.store.remove(publicationEntry.id);
        }
    }

    /**
     * Gets an unique id based on the cursors selector and options
     * @param cursors
     * @param channels
     * @returns {string}
     */
    getPublicationId(cursors, channels) {
        let id = '';

        cursors.forEach(cursor => {
            const selector = cursor._cursorDescription.selector || {};
            const options = cursor._cursorDescription.options || {};

            id += EJSON.stringify(selector) + EJSON.stringify(options);

            // const collectionName = cursor._cursorDescription.collectionName;
            // channels.forEach(channelObject => {
            //     id += channelObject.getString(collectionName);
            // });
        });

        return id;
    }
}