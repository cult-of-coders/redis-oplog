import { assert } from 'chai';
import {Orders, Items} from './collections';
import {Meteor} from 'meteor/meteor';

describe('Testing autorun functionality', function () {
    it('Should be able to subscribe', function (done) {
        Meteor.call('server_autorun_boot', function () {
            Meteor.subscribe('server_autorun_test', function () {
                assert.isUndefined(Orders.findOne());
                assert.lengthOf(Items.find().fetch(), 3);
                done();
            })
        })
    });

    it('Should be able to run the autorun function', function (done) {
        Meteor.call('server_autorun_boot', function () {
            Meteor.subscribe('server_autorun_test', function () {
                Meteor.call('server_autorun_invalidate_order', function () {
                    setTimeout(function () {
                        assert.lengthOf(Items.find().fetch(), 0);
                        done();
                    }, 300);
                })
            })
        })
    })
});
