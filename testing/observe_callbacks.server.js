import { assert } from 'chai';
import { Mongo } from 'meteor/mongo';

const Collection = new Mongo.Collection('test_observe_callbacks');

describe('Observe callbacks should work', function () {
    it('Should work', function (done) {
        Collection.removeAsync({})
            .then(async () => {
                const context = 'observe-callbacks';

                let _id;
                let inAdded = false;
                const handler = await Collection.find({context}).observe({
                    added(newDoc) {
                        assert.isObject(newDoc);
                        assert.equal(newDoc.number, 10);
                        Collection.updateAsync(newDoc._id, {
                            $set: {number: 20}
                        })
                            .catch(done)
                    },
                    changed(newDoc, oldDoc) {
                        if (oldDoc.number === 10) {
                            assert.isObject(newDoc);
                            assert.isObject(oldDoc);
                            assert.equal(newDoc.number, 20);
                            assert.equal(oldDoc.number, 10);

                            Collection.removeAsync(newDoc._id)
                                .catch(done);
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
                _id = await Collection.insertAsync({context, number: 10})
            });
    });

    it ('Should not be triggered if no changes are detected', function (done) {
        Collection.removeAsync({})
            .then(async () => {
                const _id = await Collection.insertAsync({number: 10});

                let inChanged = false;
                const handler = Collection.find().observe({
                    changed(newDoc, oldDoc) {
                        inChanged = true;
                    }
                });

                await Collection.updateAsync(_id, {
                    $set: {number: 10}
                });

                setTimeout(() => {
                    assert.isFalse(inChanged);
                    done();
                }, 100)
            })
            .catch(done)
    })
});

