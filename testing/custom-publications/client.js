import { assert } from 'chai';
import {Items} from './collections';
import {Meteor} from 'meteor/meteor';
import {Counter} from 'meteor/natestrauser:publish-performant-counts'

describe('Testing custom publications functionality', function () {
    it('Should be able to retrieve the correct number', function (done) {
        Meteor.call('custom_publications_boot', function () {
            Meteor.subscribe('custom_publications', function () {
                assert.lengthOf(Items.find().fetch(), 3);
                done();
            })
        })
    });
});

