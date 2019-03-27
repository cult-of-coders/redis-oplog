import { assert } from 'chai';
import {Items} from './collections';
import {Meteor} from 'meteor/meteor';
import {Counter} from 'meteor/natestrauser:publish-performant-counts'

describe('Testing publish-counts functionality', function () {
    it('Should be able to retrieve the correct number', function (done) {
        Meteor.call('performant_counts_boot', function () {
            Meteor.subscribe('performant_counts', function () {
                Meteor.call('performant_counts_add', function (err, res) {
                    setTimeout(function () {
                        assert.equal(Counter.get('items_count'), 4);
                        done();
                    }, 200)
                });
            })
        })
    });
});

