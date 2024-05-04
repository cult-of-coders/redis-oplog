import { assert } from 'chai';

describe('Collection', function () {

    let idx = 1;
    const Collection = new Mongo.Collection('test_return_value_' + idx++);

    it('should return the amount of updated documents when updating', async function (done) {
        const id = await Collection.insertAsync({someData: true})
        const r = await Collection.updateAsync(id, {someData: false});
        assert.strictEqual(r, 1);
        done();
    })
    it('should return the amount of updated documents when upserting with update', async function (done) {
        const id = await Collection.insertAsync({someData: true})
        const r = await Collection.updateAsync(id, {someData: false}, {upsert: true});
        assert.strictEqual(r, 1);
        done();
    })
    it('should return an object with the amount of updated documents when upserting', async function (done) {
        const id = await Collection.insertAsync({someData: true})
        const r = await Collection.upsertAsync(id, {someData: false});
        assert.deepEqual(r, {numberAffected: 1});
        done();
    })
});
