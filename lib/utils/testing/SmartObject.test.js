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
    });

    it('Should check if field is eligible', function () {
        let so = new SmartObject({
            nested: {
                field: 1
            },
            directField: 1
        }, {
            nested: 1,
            directField: 1
        });

        assert.isTrue(so.isFieldEligibleForFields('nested'));
        assert.isTrue(so.isFieldEligibleForFields('nested.fieldX'));
        assert.isTrue(so.isFieldEligibleForFields('nested.field'));
        assert.isTrue(so.isFieldEligibleForFields('directField'));
        assert.isFalse(so.isFieldEligibleForFields('directFieldx'));
        assert.isFalse(so.isFieldEligibleForFields('nestedX.field'));
    })

    it('Should work with fields', function () {
        let so = new SmartObject({
            connected: [],
            autoConnect: 'xxx',
            bullshit: 'Here'
        }, {
            connected:1, type:1, force:1, follow:1, online:1, active:1, forceModel:1, messages:1, autoConnect:1, disconnects:1, selected:1, report:1
        });

        let doc = so.cleanAndRetrieve();

        assert.isUndefined(doc.bullshit);
        assert.isArray(doc.connected);
        assert.lengthOf(doc.connected, 0);
        assert.equal(doc.autoConnect, 'xxx');
    })
});