import { EJSON } from 'meteor/ejson';
import PublicationStore from './PublicationStore';
import PublicationEntry from './PublicationEntry';
import { _ } from 'meteor/underscore';
import debug from '../debug';

export default new class PublicationFactory {
    constructor() {
        this.store = new PublicationStore();
        this.queue = new Meteor._SynchronousQueue();
    }

    /**
     * Potentially creates a new publicationEntry and returns the id
     *
     * @param cursor
     * @param observer
     * @returns {PublicationEntry}
     */
    create(cursor, observer) {
        let id = this.getPublicationId(cursor);
        let publicationEntry;

        if (this.store.has(id)) {
            publicationEntry = this.store.find(id);
            debug(`[PublicationFactory] Re-using existing publication ${publicationEntry.id}`);
        } else {
            publicationEntry = new PublicationEntry(id, cursor, this);
            debug(`[PublicationFactory] Created new subscribers for redis for: ${publicationEntry.id}`);

            this.store.add(id, publicationEntry);
        }

        publicationEntry.addObserver(observer);

        return publicationEntry;
    }

    /**
     * @param id
     */
    remove(id) {
        this.store.remove(id);
    }

    /**
     * Gets an unique id based on the cursors selector and options
     * @param cursor
     * @returns {string}
     */
    getPublicationId(cursor) {
        if (!cursor._cursorDescription) {
            return 'special::' + cursor.collection.name;
        }

        const description = cursor._cursorDescription;

        const selector = description.selector || {};
        const options = description.options || {};

        let collectionName = description.collectionName;
        if (!collectionName) {
            collectionName = description.collection.name;
        }

        return collectionName + '::' + EJSON.stringify(selector) + EJSON.stringify(_.omit(options, 'transform'));
    }
}