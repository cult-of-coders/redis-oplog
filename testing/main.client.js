import {RedisCollection} from './boot';

describe('It should update data reactively', function () {
    it('Should detect a removal', function (done) {
        let handle = Meteor.subscribe('redis_collection', {
            game: 'chess',
        }, {
            sort: {score: -1},
            limit: 5
        });

        const cursor = RedisCollection.find();

        let idOfInterest = null;
        const observeChangesHandle = cursor.observeChanges({
            removed(docId) {
                if (docId == idOfInterest) {
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                }
            }
        });

        Meteor.call('create', {
            game: 'chess',
            title: 'E'
        }, (err, _id) => {
            idOfInterest = _id;
            setTimeout(() => {
                Meteor.call('remove', {_id});
            }, 100)
        });
    });

    it('Should detect an insert', function (done) {
        let handle = Meteor.subscribe('redis_collection', {
            game: 'chess',
        }, {
            sort: {score: -1},
            limit: 5
        });

        const cursor = RedisCollection.find();

        const observeChangesHandle = cursor.observeChanges({
            added(docId, doc) {
                if (doc.title === 'E') {
                    observeChangesHandle.stop();
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

    it('Should detect an update', function (done) {
        let handle = Meteor.subscribe('redis_collection', {
            game: 'chess',
        }, {
            sort: {score: -1},
            limit: 5
        });

        const cursor = RedisCollection.find();

        const observeChangesHandle = cursor.observeChanges({
            changed(docId) {
                observeChangesHandle.stop();
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

    it('Should detect an update nested', function (done) {
        let handle = Meteor.subscribe('redis_collection', {
            game: 'chess',
        });

        Meteor.call('create', {
            game: 'chess',
            nested: {
                a: 1,
                b: 1,
                c: {
                    a: 1
                }
            }
        }, (err, docId) => {
            const cursor = RedisCollection.find();

            const observeChangesHandle = cursor.observeChanges({
                changed(docId, doc) {
                    observeChangesHandle.stop();
                    handle.stop();

                    assert.equal(doc.nested.b, 2);
                    assert.equal(doc.nested.c.b, 1);
                    assert.equal(doc.nested.c.a, 1);
                    assert.equal(doc.nested.d, 1);

                    Meteor.call('remove', {_id: docId});

                    done();
                }
            });

            Tracker.autorun((c) => {
                if (handle.ready()) {
                    c.stop();

                    Meteor.call('update', {_id: docId}, {
                        $set: {
                            'nested.c.b': 1,
                            'nested.b': 2,
                            'nested.d': 1
                        }
                    });
                }
            });
        });
    });

    it('Should detect an update of a non published document', function (done) {
        Meteor.call('create', {
            game: 'backgammon',
            title: 'test'
        }, (err, _id) => {
            let handle = Meteor.subscribe('redis_collection', {
                game: 'chess',
            });

            const score = Math.random()

            const cursor = RedisCollection.find();
            const observeChangesHandle = cursor.observeChanges({
                added(docId, doc) {
                    if (docId !== _id) return;

                    assert.equal(doc.game, 'chess');
                    assert.equal(doc.score, score);
                    assert.equal(doc.title, 'test');

                    observeChangesHandle.stop();
                    handle.stop();
                    Meteor.call('remove', { _id });
                    done();
                }
            });

            Tracker.autorun((c) => {
                if (handle.ready()) {
                    c.stop();
                    Meteor.call('update', { _id }, { $set: { game: 'chess', score } });
                }
            });
        });
    });
});
