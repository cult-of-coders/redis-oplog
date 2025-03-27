import { assert } from 'chai';
import { Mongo } from 'meteor/mongo';

const InitialAddCollection = new Mongo.Collection('initial_add');
describe('Initial Add', function () {
  let lastDocId;
  before(async function () {
    await InitialAddCollection.removeAsync({});
    for (let i = 0; i <= 10; i++) {
      lastDocId = await InitialAddCollection.insertAsync({ number: i });
    }
  });

  it('Should not crash on initial add', function (done) {
    Meteor.defer(async () => {
      let err;
      await InitialAddCollection.find().observeChanges({
        async added(_id, doc) {
          if (err) return;
          await Meteor._sleepForMs(10); // simulate a more costly operation
          try {
            assert.isDefined(doc);
          } catch (e) {
            err = e;
          }
        },
      });
      done(err);
    });
    Meteor.defer(async () => {
      await InitialAddCollection.removeAsync({ _id: lastDocId });
    });
  });
});
