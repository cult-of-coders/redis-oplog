import { assert } from 'chai';
import { Meteor } from 'meteor/meteor';
import { Counter } from 'meteor/natestrauser:publish-performant-counts'

describe('Testing publish-counts functionality', function () {
    it('Should be able to retrieve the correct number', function (done) {
        Meteor.call('performant_counts_boot', function () {
            Meteor.subscribe('performant_counts', function () {
                Meteor.callAsync('performant_counts_add')
                    .then(() => {
                        setTimeout(function () {
                            assert.equal(Counter.get('items_count'), 4);
                            done();
                        }, 200)
                    })
                    .catch((err) => {
                        done(err);
                    });
            })
        })
    });
});

