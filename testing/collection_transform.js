import { assert } from 'chai';
function Foo () {}

const fooCollection = new Mongo.Collection('foo', {
    transform: function(document) {
        return new Foo(document)
    }
});

describe('Collection Transform', function () {
    it('Should work with transform functions', function () {
        fooCollection.insert({});
        const foo = fooCollection.findOne();
        assert.isTrue(foo instanceof Foo);
    })
});
