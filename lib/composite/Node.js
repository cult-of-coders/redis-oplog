

class Node {
    constructor(parent, finder, config) {
        this.parent = parent;
        this.finder = finder;
        this.config = config;

        this.children = [];

        this.cursor = null;

        if (parent) {
            parent.children.push(this);
        }
    }

    init() {
        let {cursors, channels} = parsePublicationResponse(
            fn.call(this, ...args)
        );

        let cursor = cursors[0];

        let publicationFactory = this.config.getPublicationFactory(cursor.__cursorDescription.collectionName);
        let publicationEntry;

        publicationFactory.queue.runTask(() => {
            publicationEntry = publicationFactory.create(cursors, channels);
            publicationEntry.addObserver(this);
        });

        this.onStop(() => {
            publicationFactory.queue.runTask(() => {
                debug('[Main] Stopping the Meteor subscription for publication: ' + name);

                publicationFactory.removeObserver(publicationEntry, this.config.observer);
            });
        });
    }

    computeFinder(observer, ...args) {
        this.cursor = this.finder.call(observer, ...args);

        this.data = this.cursor.fetch();

        this.children.forEach(childNode => {
            childNode.computeFinder();
        })
    }

    /**
     * @returns {boolean}
     */
    isRoot() {
        return this.parent === null;
    }

    stop() {

    }
}