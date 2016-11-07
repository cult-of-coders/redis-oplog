import SmartObject from '../SmartObject';
import { _ } from 'meteor/underscore';

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

        const cleaned = so.cleanAndRetrieve();

        assert.lengthOf(_.keys(cleaned), 3);
        assert.isDefined(cleaned.a);
        assert.isDefined(cleaned.b);
        assert.isObject(cleaned.c);
        assert.equal(cleaned.c.a, 1);

        assert.isObject(cleaned.c.b);
        assert.lengthOf(_.keys(cleaned.c.b), 1);

        assert.equal(cleaned.c.b.a, 1);
    })
});