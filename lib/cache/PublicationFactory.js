import { EJSON } from 'meteor/ejson';
import PublicationStore from './PublicationStore';
import PublicationEntry from './PublicationEntry';
import { _ } from 'meteor/underscore';
import reload from '../processors/actions/reload';
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
        let description = cursor._cursorDescription;

        if (!description.selector) {
            description.selector = {};
        }
        if (!description.options) {
            description.options = {};
        }

        this.extendCursorWithCollectionDefaults(observer, cursor);

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
        const description = cursor._cursorDescription;
        const collectionName = this._getCollectionName(cursor);

        const {selector, options} = description;

        // because of some compatibility stuff
        return collectionName + '::' + EJSON.stringify(selector) + EJSON.stringify(_.omit(options, 'transform'));
    }

    /**
     * Refreshes all observableCollections
     */
    reloadAll() {
        const entries = this.store.getAll();

        entries.forEach(entry => {
            reload(entry.observableCollection);
        })
    }

    /**
     * @param context
     * @param cursor
     */
    extendCursorWithCollectionDefaults(context, cursor) {
        const collectionName = this._getCollectionName(cursor);
        const collection = Mongo.Collection.get(collectionName);

        if (collection && collection._redisOplog) {
            const {cursor} = collection._redisOplog;
            if (cursor) {
                let {selector, options} = cursor._cursorDescription;
                cursor.call(context, options, selector);
            }
        }
    }

    /**
     * @param cursor
     * @returns {*|string}
     * @private
     */
    _getCollectionName(cursor) {
        const description = cursor._cursorDescription;

        // because of some compatibility stuff
        let collectionName = description.collectionName;
        if (!collectionName) {
            return description.collection.name;
        }

        return collectionName;
    }
}