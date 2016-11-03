import SmartObject from '../SmartObject';

describe('Unit # SmartObject', function () {
    it('Should work', function () {
        let so = new SmartObject({
            a: 1,
            b: 2,
            c: {
                a: 1,
                b: {
                    a: 1,
                    b: 1
                },
                c: 1
            },
            nestedSort: {
                a: 1
            },
            sort: 1
        }, {
            'a': 1, 'b': 1, 'c.a': 1, 'c.b.a': 1
        }, {
            'sort': 1,
            'nestedSort.a': 1
        });

        assert.isTrue(so.fieldsExistInFieldsOptions(['a', '.ca']));
        assert.isTrue(so.fieldsExistInSortOptions(['sort']));
        assert.isTrue(so.fieldsExistInSortOptions(['nestedSort.a']));
    })
});