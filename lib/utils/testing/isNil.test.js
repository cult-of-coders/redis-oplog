import { assert } from 'chai';
import run from '../isNil';

describe('Unit # isNil', function () {
    it('Should work', function () {
        assert.isTrue(run(null));
        assert.isTrue(run(undefined));
        assert.isFalse(run(1));
        assert.isFalse(run('1'));
        assert.isFalse(run({}));
        assert.isFalse(run([]));
    });
});
