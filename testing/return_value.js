import { assert } from 'chai';

describe('Collection', function () {

    let idx = 1;
    const Collection = new Mongo.Collection('test_return_value_' + idx++);

    it('should return the amount of updated documents when updating', function () {
        const id = Collection.insert({someData: true})
        const r = Collection.update(id, {someData: false});
        assert.strictEqual(r, 1)
    })
    it('should return the amount of updated documents when upserting with update', function () {
        const id = Collection.insert({someData: true})
        const r = Collection.update(id, {someData: false}, {upsert: true});
        assert.strictEqual(r, 1)
    })
    it('should return an object with the amount of updated documents when upserting', function () {
        const id = Collection.insert({someData: true})
        const r = Collection.upsert(id, {someData: false});
        assert.deepEqual(r, {numberAffected: 1})
    })
});
