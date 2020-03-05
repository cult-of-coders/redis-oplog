import { assert } from 'chai';
import run from '../extractIdsFromSelector';

describe('Unit # extractIdsFromSelector', function () {
    it('Should work', function () {
        let ids = run({
            _id: {
                $in: ['XXX', 'YYY']
            }
        });

        assert.lengthOf(ids, 2);
        assert.include(ids, 'XXX');
        assert.include(ids, 'YYY');

        ids = run({
            _id: 'XXX'
        });

        assert.lengthOf(ids, 1);
        assert.equal(ids[0], 'XXX');
    })
});