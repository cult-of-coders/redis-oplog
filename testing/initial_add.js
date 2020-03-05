import { assert } from 'chai';
import {Mongo} from 'meteor/mongo';

const InitialAddCollection = new Mongo.Collection('initial_add')
describe('Initial Add', function () {
    let lastDocId;
    before(function () {
        InitialAddCollection.remove({});
        for (let i = 0; i <= 10; i++) {
            lastDocId = InitialAddCollection.insert({number: i})
        }
    });

    it('Should not crash on initial add', function (done) {
        Meteor.defer(() => {
            let err;
            InitialAddCollection.find().observeChanges({
                added(_id, doc) {
                    if (err) return;
                    Meteor._sleepForMs(10) // simulate a more costly operation
                    try {
                        assert.isDefined(doc)
                    } catch (e) {
                        err = e
                    }
                }
            });
            done(err);
        });
        Meteor.defer(() => {
            InitialAddCollection.remove({_id: lastDocId})
        })
    })
});
