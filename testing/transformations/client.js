import { assert } from 'chai';
import {Items} from './collections';

describe('Transformations', function () {
    it('Should receive correct data', function (done) {
        Meteor.call('transformations_boot', function () {
            const handle = Meteor.subscribe('transformations_items', function () {
                const item = Items.findOne();
                assert.isObject(item);

                assert.isTrue(item.defaultClientTransform);
                assert.isTrue(item.defaultServerTransform);
                handle.stop();
                done();
            })
        })
    })
    it('Should receive correct data with custom transform', function (done) {
        Meteor.call('transformations_boot', function () {
            const handle = Meteor.subscribe('transformations_items_custom', function () {
                const item = Items.findOne();
                assert.isObject(item);

                assert.isTrue(item.defaultClientTransform);
                assert.isUndefined(item.defaultServerTransform);
                assert.isTrue(item.customServerTransform);
                handle.stop();
                done();
            })
        })
    })
});