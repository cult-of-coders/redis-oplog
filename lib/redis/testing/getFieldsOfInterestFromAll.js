import { assert } from 'chai';
import { removeChildrenOfParents } from '../lib/getFieldsOfInterestFromAll';

describe('#removeChildrenOfParents ', function() {
    it('Should filter out children of parents from simple array', function() {
        const array = ['master.field', 'master', 'bomb'];
        const newArray = removeChildrenOfParents(array);
        assert.lengthOf(newArray, 2);
        assert.equal(newArray[0], 'master');
    });

    it('Should filter out children of parents from more complex array', function() {
        const array = ['master.field.subfield', 'master.field', 'bomb'];
        const newArray = removeChildrenOfParents(array);
        assert.lengthOf(newArray, 2);
        assert.isUndefined(newArray.find(el => el === 'master.field.subfield'));
        assert.isDefined(newArray.find(el => el === 'master.field'));
        assert.isDefined(newArray.find(el => el === 'bomb'));
    });

    it('Should work with more deeper nested fields', function() {
        const array = ['master.slave.field', 'master'];
        const newArray = removeChildrenOfParents(array);

        assert.lengthOf(newArray, 1);
        assert.isDefined(newArray.find(el => el === 'master'));
    });

    it('Should work with a very crazy case', function() {
        const array = [
            'master.slave.field',
            'maste',
            'master.slave.field.subfield',
            'slave.field',
            'slave.field.subfield',
        ];
        const newArray = removeChildrenOfParents(array);

        assert.lengthOf(newArray, 3);
        assert.isDefined(newArray.find(el => el === 'maste'));
        assert.isDefined(newArray.find(el => el === 'master.slave.field'));
        assert.isDefined(newArray.find(el => el === 'slave.field'));
    });

    it('Should work when field has a top level field as a substring', function() {
        const array = [
            'master.slave.field',
            'slave.field',
            'slave',
        ];
        const newArray = removeChildrenOfParents(array);

        assert.lengthOf(newArray, 2);
        assert.isDefined(newArray.find(el => el === 'master.slave.field'));
        assert.isDefined(newArray.find(el => el === 'slave'));
    });
});
