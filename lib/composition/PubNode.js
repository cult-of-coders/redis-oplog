class PubNode {
    /**
     * @param root
     * @param config
     */
    constructor(root, config) {
        this.root = root;
        this.children = [];
        this.setConfig(config);

        if (this.root) {
            this.root.children.push(this);
        }

        this.buildChildren();
    }

    build() {
        // first we build the full data tree.

    }

    /**
     * @param find
     * @param children
     */
    setConfig({find, children}) {
        this.config = {
            find,
            children
        }
    }

    /**
     *
     */
    buildChildren() {
        if (!this.config.children) {
            return;
        }

        _.each(this.config.children, childConfig => {
            new PubNode(this, childConfig)
        });
    }
}