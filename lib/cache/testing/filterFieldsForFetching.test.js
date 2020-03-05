import { assert } from 'chai';
import {filterDisallowedFields, filterAllowedFields} from '../lib/filterFieldsForFetching';

describe('Filter fields for fetching', function () {
    it('Should work with allowed fields', function () {
        const fields = filterAllowedFields([
            'profile',
            'address.city',
            'fullname'
        ], [
            'profile.firstName',
            'address',
            'fullname'
        ]);

        assert.equal(fields['profile.firstName'], 1);
        assert.equal(fields['address.city'], 1);
        assert.equal(fields['fullname'], 1);
    });

    it('Should work with disallowed fields', function () {
        const fields = filterDisallowedFields([
            'profile',
            'address.city',
            'fullname'
        ], [
            'profile.firstName',
            'address',
            'fullname'
        ]);

        assert.isUndefined(fields['fullname']);
        assert.equal(fields['address'], 1);
        assert.isUndefined(fields['profile.firstName']);
    })
});