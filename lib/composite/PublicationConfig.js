export default class {
    constructor(data) {
        this.root = null;
        this.name = null;
        this.observer = null;

        _.extend(this, data);

        this.publicationFactoryStore = {};
    }

    /**
     * Initializes all handles
     */
    init(...args) {
        this.root = this.parse(this.config, null);

        this.root.init();
    }

    /**
     * Stops all handles
     */
    stop() {
        this.root.stop();
    }

    /**
     * @param name
     * @returns {*}
     */
    getPublicationFactory(name) {
        if (!this.publicationFactoryStore[name]) {
            this.publicationFactoryStore = new PublicationFactory(
                name
            )
        }

        return this.publicationFactoryStore[name];
    }

    /**
     * @param data
     * @param parent
     * @returns {Node}
     */
    parse(data, parent) {
        const {find, children} = data;

        const node = new Node(parent, find, this);

        children.forEach(child => {
            this.parse(child, node);
        });

        return node;
    }
}