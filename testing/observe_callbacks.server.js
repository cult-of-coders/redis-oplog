import { Mongo } from 'meteor/mongo';

describe('Observe callbacks should work with added()', function () {
    const Collection = new Mongo.Collection('test_observe_callbacks');


    it('Should work', function (done) {
        Collection.remove({});

        let inAdded, inChanged, inRemoved;

        const handler = Collection.find().observe({
            added(newDoc) {
                assert.isObject(newDoc);
                assert.equal(newDoc.number, 10);
                inAdded = true;
            },
            changed(newDoc, oldDoc) {
                if (oldDoc.number === 10) {
                    assert.isObject(newDoc);
                    assert.isObject(oldDoc);
                    assert.equal(newDoc.number, 20);
                    assert.equal(oldDoc.number, 10);
                    inChanged = true;
                }
            },
            removed(oldDoc) {
                assert.isObject(oldDoc);
                assert.equal(oldDoc.number, 20);
                inRemoved = true;
            }
        });

        assert.isFunction(handler.stop);

        const _id = Collection.insert({number: 10});
        Collection.update(_id, {
            $set: {number: 20}
        });
        Collection.remove(_id);

        setTimeout(() => {
            assert.isTrue(inAdded);
            assert.isTrue(inChanged);
            assert.isTrue(inRemoved);

            handler.stop();

            done();
        }, 100)
    })
});
