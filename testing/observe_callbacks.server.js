import { assert } from 'chai';
import { Mongo } from 'meteor/mongo';

const Collection = new Mongo.Collection('test_observe_callbacks');

describe('Observe callbacks should work', function () {
    it('Should work', async function (done) {
        await Collection.removeAsync({});

        const context = 'observe-callbacks';

        let _id;
        let inAdded = false;
        const handler = await Collection.find({context}).observe({
            async added(newDoc) {
                assert.isObject(newDoc);
                assert.equal(newDoc.number, 10);
                await Collection.updateAsync(newDoc._id, {
                    $set: {number: 20}
                });
            },
            async changed(newDoc, oldDoc) {
                if (oldDoc.number === 10) {
                    assert.isObject(newDoc);
                    assert.isObject(oldDoc);
                    assert.equal(newDoc.number, 20);
                    assert.equal(oldDoc.number, 10);

                    await Collection.removeAsync(newDoc._id);
                }
            },
            async removed(oldDoc) {
                assert.isObject(oldDoc);
                assert.equal(oldDoc.number, 20);
                await handler.stop();
                done();
            }
        });

        assert.isFunction(handler.stop);
        await Collection.insertAsync({context, number: 10});
    });

    it ('Should not be triggered if no changes are detected', async function (done) {
        await Collection.removeAsync({});
        const _id = await Collection.insertAsync({number: 10});

        let inChanged = false;
        const handler = await Collection.find().observe({
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
});
