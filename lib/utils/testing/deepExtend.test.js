import deepExtend from '../deepExtend';

describe('Unit # deepExtend', function () {
    it('Should extend objects properly', function () {
        let a = {
            a: 1,
            b: 2,
            c: [1,2,3]
        };
        let b = {
            a: {a: 1},
            b: [],
            c: [1,2]
        };

        deepExtend(a, b);

        assert.isObject(a.a);
        assert.equal(a.a.a, 1);
        assert.isArray(a.b);

        assert.isArray(a.c);
        assert.lengthOf(a.c, 2);
    })
});