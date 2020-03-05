import { assert } from 'chai';
import getStrategy from '../getStrategy';
import { Strategy } from '../../constants';
import { _ } from 'meteor/underscore';

describe('Processors - Guess Strategy', function () {
    it('should work', function () {
        assert.equal(Strategy.DEFAULT, getStrategy({isFiltered: true}));
        assert.equal(Strategy.DEFAULT, getStrategy({isFiltered: true}, {sort: {createdAt: -1}}));

        assert.equal(Strategy.DEDICATED_CHANNELS, getStrategy({
            _id: 'STRING'
        }));

        assert.equal(Strategy.DEDICATED_CHANNELS, getStrategy({
            _id: {$in: []}
        }));

        assert.equal(Strategy.LIMIT_SORT, getStrategy({
            _id: {$in: []}
        }, {
            limit: 100,
            sort: {
                createdAt: -1
            }
        }));

        assert.equal(Strategy.LIMIT_SORT, getStrategy({}, {
            limit: 100,
            sort: {
                createdAt: -1
            }
        }));
    })
});