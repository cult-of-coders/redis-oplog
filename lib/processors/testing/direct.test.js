import process from '../direct';
import { Events } from '../../constants';

describe('Processors - Direct', function () {
    it('should only work with update/remove', function () {
        let observableCollection = {
            isEligibleByDB() {
                return true;
            },
            contains() {
                return true;
            },
            change(docId, doc) {
                assert.equal(doc._id, 'YYY');
                assert.equal(docId, 'YYY');
            },
            remove(docId) {
                assert.equal(docId, 'YYY');
            }
        };

        process(observableCollection, Events.UPDATE, {
            _id: 'YYY',
        });
        process(observableCollection, Events.REMOVE, {
            _id: 'YYY',
        });
    })
});