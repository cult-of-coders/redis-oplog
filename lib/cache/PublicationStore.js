import { Meteor } from 'meteor/meteor';

export default class PublicationStore {
    /**
     * Creates the store
     */
    constructor(name) {
        this.name = name;
        /**
         * {
         *   id: PublicationEntry
         * }
         */
        this.store = {};
    }

    /**
     * @param id
     * @returns {boolean}
     */
    has(id) {
        return !!this.store[id];
    }

    /**
     * @param id
     * @returns {*}
     */
    find(id) {
        return this.store[id];
    }

    /**
     * @param id
     * @param publicationEntry
     */
    add(id, publicationEntry) {
        if (this.store[id]) {
            throw new Meteor.Error(`You cannot add a publication to this store, because it already exists: ${this.name}::${id}`);
        }

        this.store[id] = publicationEntry;
    }

    /**
     * @param id
     */
    remove(id) {
        delete this.store[id];
    }
}