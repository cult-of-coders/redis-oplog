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

    describe('It should work with synthetic mutators: ' + key, function() {
        it('Should work with insert', async function(done) {
            let handle = subscribe({
                game: `synthetic.${config[key].suffix}`,
            });

            const cursor = Collection.find();

            let observeChangesHandle = cursor.observeChanges({
                added(docId, doc) {
                    assert.equal(doc.game, `synthetic.${config[key].suffix}`);
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                },
            });

            await waitForHandleToBeReady(handle);

            synthetic('insert', {
                game: `synthetic.${config[key].suffix}`,
            });
        });

        it('Should work with update with operators: $set', async function(done) {
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

            await waitForHandleToBeReady(handle);

            let _id = cursor.fetch()[0]._id;
            assert.isString(_id);

            synthetic('update', _id, {
                $set: {
                    isPlaying: true,
                },
            });
        });

        it('Should work with update with operators: $push', async function(done) {
            let _id = await createSync({
                synthetic_test: true,
                connections: [],
            });

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

            await waitForHandleToBeReady(handle);

            synthetic('update', _id, {
                $push: {
                    connections: 1,
                },
            });
        });

        it('Should work with update', async function(done) {
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

            await waitForHandleToBeReady(handle);

            let _id = cursor.fetch()[0]._id;
            assert.isString(_id);

            synthetic('update', _id, {
                $set: {
                    isPlaying: true,
                },
            });
        });

        it('Should work with remove', async function(done) {
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

            await waitForHandleToBeReady(handle);

            _id = cursor.fetch()[0]._id;
            assert.isString(_id);

            synthetic('remove', _id);
        });

        it('Should work with update with _id', async function(done) {
            const context = 'synth-with-id';

            let _id = await createSync({ context });
            let handle = subscribe({
                _id: { $in: [_id] },
            });

            const cursor = Collection.find();
            await waitForHandleToBeReady(handle);

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
