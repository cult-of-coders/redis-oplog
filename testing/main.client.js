import { RedisCollection } from './boot';

describe('It should update data reactively', function () {
   it('Should detect an insert', function (done) {
      let handle = Meteor.subscribe('redis_collection', {
         game: 'chess',
      }, {
         sort: {score: -1},
         limit: 5
      });

      const cursor = RedisCollection.find();

      cursor.observeChanges({
         added(docId, doc) {
            if (doc.title === 'E') {
               handle.stop();
               Meteor.call('remove', {_id: docId}, function () {
                  done();
               });
            }
         }
      });

      Tracker.autorun((c) => {
         if (handle.ready()) {
            c.stop();
            let data = cursor.fetch();

            assert.lengthOf(data, 3);

            Meteor.call('create', {
               game: 'chess',
               title: 'E'
            });
         }
      });
   });

   it('Should detect a removal', function (done) {
      let handle = Meteor.subscribe('redis_collection', {
         game: 'chess',
      }, {
         sort: {score: -1},
         limit: 5
      });

      const cursor = RedisCollection.find();

      cursor.observeChanges({
         removed(docId) {
            handle.stop();
            done();
         }
      });

      Meteor.call('create', {
         game: 'chess',
         title: 'E'
      }, (err, _id) => {
         Tracker.autorun((c) => {
            if (handle.ready()) {
               c.stop();

               Meteor.call('remove', {_id});
            }
         });
      });
   });

   it('Should detect an update', function (done) {
      let handle = Meteor.subscribe('redis_collection', {
         game: 'chess',
      }, {
         sort: {score: -1},
         limit: 5
      });

      const cursor = RedisCollection.find();

      cursor.observeChanges({
         changed(docId) {
            handle.stop();
            done();
         }
      });

      Tracker.autorun((c) => {
         if (handle.ready()) {
            c.stop();
            let data = cursor.fetch();

            Meteor.call('update', {_id: data[0]._id}, {
               $set: {
                  score: Math.random()
               }
            });
         }
      });
   });
});
