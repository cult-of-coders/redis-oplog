import { assert } from 'chai';
import { SmartIds } from './collections';
import { Meteor } from 'meteor/meteor';

describe('ObjectId', function() {
    it('Should work!', async function(done) {
        const [id1, id2] = await Meteor.callWithPromise('smart_ids_reset');

        const handle = Meteor.subscribe(
            'smart_ids',
            {
                _id: id1
            },
            function() {
                const result = SmartIds.findOne();

                assert.isObject(result);
                assert.isObject(result._id);
                done();
            }
        );
    });
});
