import parser from '../parser';

describe('Publish Composite Parser', function () {
    it('should parse the data properly into a node', function () {
        const node = parser({
            find() {

            },
            children: [
                {
                    find() {

                    },
                    children: [
                        {
                            find() {

                            }
                        },
                        {
                            find() {

                            }
                        }
                    ]
                },
                {
                    find() {

                    }
                }
            ]
        });

        assert.isObject(node);

        assert.isFunction(node.finder);
        assert.lengthOf(node.children, 2);

        node.children.forEach(child => assert.isFunction(child.finder));

        assert.lengthOf(node.children[0].children, 2);
        node.children[0].children.forEach(child => assert.isFunction(child.finder));

        assert.lengthOf(node.children[1].children, 0);
    })
});
