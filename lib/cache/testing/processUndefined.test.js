import processUndefined from '../lib/processUndefined';

describe('Test processUndefined function', function () {
    it('Should undefine properly', function () {
        let doc = {
            code: 'XXX',
            profile: {
                name: 'John Smith',
                address: 'Street 123'
            },
            deep: {
                nested: {
                    object: 1
                }
            }
        };

        processUndefined(doc, [
            'nothingness',
            'profile.street',
            'shop.nested',
            'deep.nested.nonExisting',
        ]);

        assert.isTrue('nothingness' in doc);
        assert.isTrue('street' in doc.profile);
        assert.isTrue('nonExisting' in doc.deep.nested);
        assert.isTrue('shop' in doc)
    })
})