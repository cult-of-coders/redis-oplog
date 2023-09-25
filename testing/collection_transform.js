import { assert } from 'chai';
function Foo () {}

const fooCollection = new Mongo.Collection('foo', {
    transform: function(document) {
        return new Foo(document)
    }
});

describe('Collection Transform', function () {
    it('Should work with transform functions', async function () {
        await fooCollection.insertAsync({});
        const foo = await fooCollection.findOneAsync();
        assert.isTrue(foo instanceof Foo);
    })
});
