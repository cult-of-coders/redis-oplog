import PublicationStore from '../PublicationStore';
import { Events } from '../../constants';

describe('Unit-Test PublicationStore', function () {
    it('should have basic storage functionality', function () {
        const ps = new PublicationStore('test');

        const object = {};

        assert.isFalse(ps.has('XXX'));
        ps.add('XXX', object);
        assert.isTrue(ps.has('XXX'));

        assert.equal(object, ps.find('XXX'));

        ps.remove('XXX');
        assert.isFalse(ps.has('XXX'));
        assert.isUndefined(ps.find('XXX'));
    })
});