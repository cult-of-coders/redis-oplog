import { Collections, config } from './boot';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';

_.each(Collections, (Collection, key) => {
    describe('It should work with synthetic mutators: ' + key, function () {
        it ('Should work with insert', function (done) {
            let handle = Meteor.subscribe(`publication.${config[key].suffix}`, {
                game: `synthetic.${config[key].suffix}`,
            });

            const cursor = Collection.find();

            let observeChangesHandle = cursor.observeChanges({
                added(docId, doc) {
                    assert.equal(doc.game, `synthetic.${config[key].suffix}`);
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                }
            });

            Tracker.autorun((c) => {
                if (handle.ready()) {
                    c.stop();

                    Meteor.call(`synthetic.${config[key].suffix}`, 'insert', {
                        game: `synthetic.${config[key].suffix}`
                    })
                }
            });
        });

        it ('Should work with update with operators', function (done) {
            let handle = Meteor.subscribe(`publication.${config[key].suffix}`, {
                game: 'chess',
            });

            const cursor = Collection.find();

            let observeChangesHandle = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(doc.isPlaying, true);
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                }
            });

            Tracker.autorun((c) => {
                if (handle.ready()) {
                    c.stop();
                    let _id = cursor.fetch()[0]._id;
                    assert.isString(_id);

                    Meteor.call(`synthetic.${config[key].suffix}`, 'update', _id, {
                        $set: {
                            isPlaying: true
                        },
                    })
                }
            });
        })

        it ('Should work with update', function (done) {
            let handle = Meteor.subscribe(`publication.${config[key].suffix}`, {
                game: 'chess',
            });

            const cursor = Collection.find();

            let observeChangesHandle = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(doc.isPlaying, true);
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                }
            });

            Tracker.autorun((c) => {
                if (handle.ready()) {
                    c.stop();
                    let _id = cursor.fetch()[0]._id;
                    assert.isString(_id);

                    Meteor.call(`synthetic.${config[key].suffix}`, 'update', _id, {
                        isPlaying: true
                    })
                }
            });
        })

        it ('Should work with remove', function (done) {
            let handle = Meteor.subscribe(`publication.${config[key].suffix}`, {
                game: 'chess',
            });

            const cursor = Collection.find();

            let idOfInterest;
            let observeChangesHandle = cursor.observeChanges({
                removed(docId, doc) {
                    if (docId == idOfInterest) {
                        observeChangesHandle.stop();
                        handle.stop();
                        done();
                    }
                }
            });

            Tracker.autorun((c) => {
                if (handle.ready()) {
                    c.stop();
                    idOfInterest = cursor.fetch()[0]._id;
                    assert.isString(idOfInterest);

                    Meteor.call(`synthetic.${config[key].suffix}`, 'remove', idOfInterest)
                }
            });
        })
    });
});
