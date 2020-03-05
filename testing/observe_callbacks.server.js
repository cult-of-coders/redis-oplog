import { assert } from 'chai';
import { Mongo } from 'meteor/mongo';

const Collection = new Mongo.Collection('test_observe_callbacks');

describe('Observe callbacks should work', function () {
    it('Should work', function (done) {
        Collection.remove({});

        const context = 'observe-callbacks';

        let _id;
        let inAdded = false;
        const handler = Collection.find({context}).observe({
            added(newDoc) {
                assert.isObject(newDoc);
                assert.equal(newDoc.number, 10);
                Collection.update(newDoc._id, {
                    $set: {number: 20}
                });
            },
            changed(newDoc, oldDoc) {
                if (oldDoc.number === 10) {
                    assert.isObject(newDoc);
                    assert.isObject(oldDoc);
                    assert.equal(newDoc.number, 20);
                    assert.equal(oldDoc.number, 10);

                    Collection.remove(newDoc._id);
                }
            },
            removed(oldDoc) {
                assert.isObject(oldDoc);
                assert.equal(oldDoc.number, 20);
                handler.stop();
                done();
            }
        });

        assert.isFunction(handler.stop);
        _id = Collection.insert({context, number: 10});
    });

    it ('Should not be triggered if no changes are detected', function (done) {
        Collection.remove({});
        const _id = Collection.insert({number: 10});

        let inChanged = false;
        const handler = Collection.find().observe({
            changed(newDoc, oldDoc) {
                inChanged = true;
            }
        });

        Collection.update(_id, {
            $set: {number: 10}
        });

        setTimeout(() => {
            assert.isFalse(inChanged);
            done();
        }, 100)
    })
});
