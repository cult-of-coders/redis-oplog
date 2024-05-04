import { assert } from 'chai';
import { Collections, config } from './boot';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import helperGenerator from './lib/helpers';

_.each(Collections, (Collection, key) => {
    const {
        update,
        createSync,
        remove,
        synthetic,
        subscribe,
        waitForHandleToBeReady,
    } = helperGenerator(config[key].suffix);

    if (config[key].disableSyntheticTests) {
        return;
    }

    describe('It should work with synthetic mutators: ' + key, function () {
        it('Should work with insert', function (done) {
            let handle = subscribe({
                game: `synthetic.${config[key].suffix}`,
            });

            const cursor = Collection.find({});

            let observeChangesHandle = cursor.observeChanges({
                added(docId, doc) {
                    assert.equal(doc.game, `synthetic.${config[key].suffix}`);
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                },
            });

            waitForHandleToBeReady(handle).then(function () {
                synthetic('insert', {
                    game: `synthetic.${config[key].suffix}`,
                });
            });
        });

        it('Should work with update with operators: $set', function (done) {
            let handle = subscribe({
                game: 'chess',
            });

            const cursor = Collection.find({ game: 'chess' });

            let observeChangesHandle = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(doc.isPlaying, true);
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                },
            });

            waitForHandleToBeReady(handle).then(function () {
                // TODO: when the handle is ready not always the documents are
                // on the collection.
                const _id = cursor.fetch()[0]._id;
                assert.isString(_id);

                synthetic('update', _id, {
                    $set: {
                        isPlaying: true,
                    },
                });
            });
        });

        it('Should work with update with operators: $push', function (done) {
            createSync({
                synthetic_test: true,
                connections: [],
            }).then(function (_id) {
                let handle = subscribe({ synthetic_test: true });

                const cursor = Collection.find({
                    synthetic_test: true,
                });

                let observeChangesHandle = cursor.observeChanges({
                    changed(docId, doc) {
                        assert.lengthOf(doc.connections, 1);
                        observeChangesHandle.stop();
                        handle.stop();
                        done();
                    },
                });

                waitForHandleToBeReady(handle).then(function () {
                    synthetic('update', _id, {
                        $push: {
                            connections: 1,
                        },
                    });
                });
            });
        });

        it('Should work with update', function (done) {
            let handle = subscribe({ game: 'chess' });

            const cursor = Collection.find();

            let observeChangesHandle = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(doc.isPlaying, true);
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                },
            });

            waitForHandleToBeReady(handle).then(function () {
                let _id = cursor.fetch()[0]._id;
                assert.isString(_id);

                synthetic('update', _id, {
                    $set: {
                        isPlaying: true,
                    },
                });
            });
        });

        it('Should work with remove', function (done) {
            let handle = subscribe({
                game: 'chess',
            });

            const cursor = Collection.find();

            let _id;
            let observeChangesHandle = cursor.observeChanges({
                removed(docId, doc) {
                    if (docId == _id) {
                        observeChangesHandle.stop();
                        handle.stop();
                        done();
                    }
                },
            });

            waitForHandleToBeReady(handle).then(function () {
                _id = cursor.fetch()[0]._id;
                assert.isString(_id);

                synthetic('remove', _id);
            });
        });

        it('Should work with update with _id', function (done) {
            const context = 'synth-with-id';

            createSync({ context }).then(function (_id) {
                let handle = subscribe({
                    _id: { $in: [_id] },
                });

                const cursor = Collection.find();
                waitForHandleToBeReady(handle).then(function () {
                    let observer = cursor.observeChanges({
                        changed(docId, doc) {
                            assert.equal(docId, _id);
                            assert.equal(doc.isPlaying, true);
                            observer.stop();
                            handle.stop();
                            done();
                        },
                    });

                    synthetic(
                        'update',
                        _id,
                        {
                            $set: {
                                isPlaying: true,
                            },
                        },
                        `${Collection._name}::${_id}`
                    );
                });
            });
        });
    });
});
