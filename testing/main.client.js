import { assert } from 'chai';
import { Collections, config } from './boot';
import { _ } from 'meteor/underscore';
import './synthetic_mutators';
import './client_side_mutators';
import './publishComposite/client.test';
import './optimistic-ui/client.test';
// import './server-autorun/client';
import './transformations/client';
import './publish-counts/client';
import './custom-publications/client';
import './collection-defaults/client';
import './vent/client';
import './accounts/client';
import './polling/client';
import './object-id/client';

import { Random } from 'meteor/random';
import helperGenerator from './lib/helpers';

_.each(Collections, (Collection, key) => {
    const {
        create,
        createSync,
        update,
        updateSync,
        upsert,
        upsertSync,
        remove,
        removeSync,
        subscribe,
        waitForHandleToBeReady,
    } = helperGenerator(config[key].suffix);

    describe('It should work with: ' + key, function() {
        it('Should detect a removal', async function(done) {
            let handle = subscribe(
                {
                    game: 'chess',
                },
                {
                    sort: { score: -1 },
                    limit: 5,
                }
            );

            const randomTitle = Random.id();
            const cursor = Collection.find();
            let _id;

            let observeChangesHandle = cursor.observeChanges({
                added(docId, doc) {
                    if (doc.title === randomTitle) {
                        remove({ _id: docId });
                    }
                },
                removed(docId) {
                    assert.equal(docId, _id);
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                },
            });

            await waitForHandleToBeReady(handle);

            _id = await createSync({ game: 'chess', title: randomTitle });
        });

        it('Should detect an insert', async function(done) {
            let handle = subscribe(
                {
                    game: 'chess',
                },
                {
                    sort: { score: -1 },
                    limit: 5,
                }
            );

            const cursor = Collection.find({ game: 'chess' });

            let observeChangesHandle = cursor.observeChanges({
                added(docId, doc) {
                    if (doc.title === 'E') {
                        observeChangesHandle.stop();
                        handle.stop();
                        remove({ _id: docId }, function() {
                            done();
                        });
                    }
                },
            });

            await waitForHandleToBeReady(handle);
            let data = cursor.fetch();

            assert.lengthOf(data, 3);

            create({
                game: 'chess',
                title: 'E',
            });
        });

        it('Should detect an update simple', async function(done) {
            let handle = subscribe(
                {
                    game: 'chess',
                },
                {
                    sort: { score: -1 },
                    limit: 5,
                }
            );

            const cursor = Collection.find();

            const observeChangesHandle = cursor.observeChanges({
                changed(docId) {
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                },
            });

            await waitForHandleToBeReady(handle);

            let data = cursor.fetch();

            update(
                { _id: data[0]._id },
                {
                    $set: {
                        score: Math.random(),
                    },
                }
            );
        });

        it('Should detect an update deeply nested', async function(done) {
            let docId = await createSync({
                game: 'chess',
                nested: {
                    a: 1,
                    b: 1,
                    c: {
                        a: 1,
                    },
                },
            });

            let handle = subscribe({ _id: docId });
            const cursor = Collection.find({ _id: docId });

            const observeChangesHandle = cursor.observeChanges({
                changed(docId, doc) {
                    observeChangesHandle.stop();
                    handle.stop();

                    assert.equal(doc.nested.b, 2);
                    assert.equal(doc.nested.a, 1);
                    assert.equal(doc.nested.c.b, 1);
                    assert.equal(doc.nested.c.a, 1);
                    assert.equal(doc.nested.d, 1);
                    assert.lengthOf(_.keys(doc), 1);
                    assert.lengthOf(_.keys(doc.nested), 4);

                    remove({ _id: docId }, () => {
                        done();
                    });
                },
            });

            await waitForHandleToBeReady(handle);

            update(
                { _id: docId },
                {
                    $set: {
                        'nested.c.b': 1,
                        'nested.b': 2,
                        'nested.d': 1,
                    },
                }
            );
        });

        it('Should not update multiple documents if not specified (multi:true)', async function(done) {
            const context = Random.id();
            [_id1, _id2] = await createSync([
                { context, game: 'monopoly', title: 'test' },
                { context, game: 'monopoly', title: 'test2' },
            ]);

            let handle = subscribe({ game: 'monopoly' });
            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ _id: { $in: [_id1, _id2] } });

            const observeChangesHandle = cursor.observeChanges({
                changed(docId) {
                    assert.equal(docId, _id1);
                    observeChangesHandle.stop();
                    handle.stop();
                    done();

                    remove({ context, game: 'monopoly' });
                },
            });

            update(
                { context, game: 'monopoly' },
                { $set: { score: Math.random() } }
            );
        });

        it('Should update multiple documents if specified', async function(done) {
            const context = 'multi-update';
            [_id1, id2] = await createSync([
                { context, title: 'test' },
                { context, title: 'test2' },
            ]);

            let handle = subscribe({ context });
            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });

            let changes = 0;
            const observeChangesHandle = cursor.observeChanges({
                changed(docId) {
                    changes += 1;

                    if (changes === 2) {
                        observeChangesHandle.stop();
                        handle.stop();
                        done();
                    }
                },
            });

            update(
                { context },
                {
                    $set: { score: Math.random() },
                },
                { multi: true }
            );
        });

        it('Should detect an update of a non published document', async function(done) {
            let _id = await createSync({
                game: 'backgammon',
                title: 'test',
            });

            let handle = subscribe({
                game: 'chess',
            });

            const score = Math.random();
            const cursor = Collection.find();

            const observeChangesHandle = cursor.observeChanges({
                added(docId, doc) {
                    if (docId !== _id) return;

                    assert.equal(doc.game, 'chess');
                    assert.equal(doc.score, score);
                    assert.equal(doc.title, 'test');

                    observeChangesHandle.stop();
                    handle.stop();
                    remove({ _id }, () => {
                        done();
                    });
                },
            });

            await waitForHandleToBeReady(handle);

            update({ _id }, { $set: { game: 'chess', score } });
        });

        it('Should detect an update of a nested field when fields is specified', async function(done) {
            let _id = await createSync({
                roles: {
                    _groups: ['company1', 'company2', 'company3'],
                    _main: 'company1',
                    _global: {
                        roles: ['manage-users', 'manage-profiles'],
                    },
                },
            });

            let handle = subscribe(
                {},
                {
                    fields: { roles: 1 },
                }
            );

            const cursor = Collection.find();
            const observeChangesHandle = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(docId, _id);
                    handle.stop();
                    observeChangesHandle.stop();
                    done();
                    remove({ _id });
                },
            });

            await waitForHandleToBeReady(handle);
            update({ _id }, { $set: { 'roles._main': 'company2' } });
        });

        it('Should update properly a nested field when a positional parameter is used', async function(done) {
            const context = 'positional-paramter';

            let _id = await createSync({
                context,
                bom: [
                    {
                        stockId: 1,
                        quantity: 1,
                    },
                    {
                        stockId: 2,
                        quantity: 2,
                    },
                    {
                        stockId: 3,
                        quantity: 3,
                    },
                ],
            });

            let handle = subscribe(
                { context },
                {
                    fields: {
                        context: 1,
                        bom: 1,
                    },
                }
            );

            const cursor = Collection.find({ context });
            const observeChangesHandle = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(docId, _id);
                    doc.bom.forEach(element => {
                        assert.isTrue(_.keys(element).length === 2);
                        if (element.stockId === 1) {
                            assert.equal(element.quantity, 30);
                        } else {
                            assert.equal(element.quantity, element.stockId);
                        }
                    });
                    handle.stop();
                    observeChangesHandle.stop();
                    remove({ _id });
                    done();
                },
            });

            await waitForHandleToBeReady(handle);

            update(
                { _id, 'bom.stockId': 1 },
                {
                    $set: { 'bom.$.quantity': 30 },
                }
            );
        });

        ['server'].forEach(context => {
            it('Should work with $and operators: ' + context, async function(
                done
            ) {
                let _id = await createSync({
                    orgid: '1',
                    siteIds: ['1', '2'],
                    Year: 2017,
                });

                let handle = subscribe({
                    $and: [
                        {
                            orgid: '1',
                        },
                        {
                            siteIds: { $in: ['1'] },
                        },
                        {
                            Year: { $in: [2017] },
                        },
                    ],
                });

                await waitForHandleToBeReady(handle);

                const cursor = Collection.find();
                let inChangedEvent = false;
                const observeChangesHandle = cursor.observeChanges({
                    changed(docId, doc) {
                        assert.equal(docId, _id);
                        inChangedEvent = true;
                        // assert.equal(doc.something, 30);
                        update({ _id }, { $set: { Year: 2018 } });
                    },
                    removed(docId) {
                        assert.isTrue(inChangedEvent);
                        assert.equal(docId, _id);

                        handle.stop();
                        observeChangesHandle.stop();
                        done();
                    },
                });

                update(
                    { _id },
                    {
                        $set: {
                            something: 30,
                        },
                    }
                );
            });
        });

        it('Should be able to detect subsequent updates for direct processing with _ids', async function(done) {
            let [_id1, _id2] = await createSync([
                { subsequent_test: true, name: 'John Smith' },
                { subsequent_test: true, name: 'Michael Willow' },
            ]);

            let handle = subscribe(
                { _id: { $in: [_id1, _id2] } },
                {
                    fields: { subsequent_test: 1, name: 1 },
                }
            );

            const cursor = Collection.find({ subsequent_test: true });
            let inFirst = false;

            const observer = cursor.observeChanges({
                changed(docId, doc) {
                    if (docId == _id1) {
                        inFirst = true;
                        assert.equal('John Smithy', doc.name);
                    }
                    if (docId == _id2) {
                        assert.isTrue(inFirst);
                        assert.equal('Michael Willowy', doc.name);
                        handle.stop();
                        observer.stop();
                        done();
                    }
                },
            });

            await waitForHandleToBeReady(handle);

            await updateSync(_id1, {
                $set: { name: 'John Smithy' },
            });
            await updateSync(_id2, {
                $set: { name: 'Michael Willowy' },
            });
        });

        it('Should work with the $addToSet', async function(done) {
            let _id = await createSync({
                operators: true,
                connections: [1, 2],
                number: 10,
            });

            let handle = subscribe({ _id });
            let cursor = Collection.find({ _id });

            await waitForHandleToBeReady(handle);

            const observer = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(docId, _id);
                    assert.lengthOf(doc.connections, 3);

                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            await updateSync(
                { _id },
                {
                    $addToSet: {
                        connections: 3,
                    },
                }
            );
        });

        it('Should work with the $pull', async function(done) {
            let _id = await createSync({
                operators: true,
                connections: [1, 2],
                number: 10,
            });

            let handle = subscribe({ _id });
            let cursor = Collection.find({ _id });

            await waitForHandleToBeReady(handle);

            const observer = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(docId, _id);
                    assert.lengthOf(doc.connections, 1);

                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            await updateSync(
                { _id },
                {
                    $pull: {
                        connections: 2,
                    },
                }
            );
        });

        it('Should work with nested field updates', async function(done) {
            let _id = await createSync({
                profile: {
                    language: 'EN',
                    email: 'xxx@xxx.com',
                    number: 5,
                },
            });

            let handle = subscribe({ _id });
            let cursor = Collection.find({ _id });

            await waitForHandleToBeReady(handle);

            const observer = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(docId, _id);
                    assert.equal(doc.profile.number, 10);
                    const fullDoc = Collection.findOne(docId);
                    assert.equal(fullDoc.profile.language, 'EN');
                    assert.equal(fullDoc.profile.email, 'xxx@xxx.com');

                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            await updateSync(_id, {
                $set: {
                    'profile.number': 10,
                },
            });
        });

        it('Should work with the $pull and $set in combination', async function(done) {
            let _id = await createSync({
                test_pull_and_set_combo: true,
                connections: [1],
                number: 10,
            });

            let handle = subscribe({ test_pull_and_set_combo: true });
            let cursor = Collection.find(
                {
                    _id: {
                        $in: [_id],
                    },
                },
                {
                    fields: {
                        connections: 1,
                        number: 1,
                    },
                }
            );

            await waitForHandleToBeReady(handle);

            const observer = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(docId, _id);
                    assert.equal(doc.number, 20);
                    assert.lengthOf(doc.connections, 0);

                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            await updateSync(_id, {
                $pull: {
                    connections: { $in: [1] },
                },
                $set: {
                    number: 20,
                },
            });
        });

        it('Should work properly with limit-sort kind of queries', async function(done) {
            const context = 'limit-sort-test';
            const limit = 5;
            await removeSync({ context });

            const ids = await createSync([
                { context, number: 5, text: 'T - 1' },
                { context, number: 10, text: 'T - 2' },
                { context, number: 15, text: 'T - 3' },
                { context, number: 20, text: 'T - 4' },
                { context, number: 25, text: 'T - 5' },
                { context, number: -1, text: 'T - Last one' },
            ]);

            const [_id1, _id2, _id3, _id4, _id5, _id6] = ids;

            const handle = subscribe(
                {
                    context,
                },
                {
                    limit,
                    sort: { number: -1 },
                }
            );

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });
            let inChanged = false;
            let initialAddBlast = true;
            const observer = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(docId, _id2);
                    assert.equal(doc.number, 30);
                    inChanged = true;
                },
                removed(docId) {
                    if (docId === _id3) {
                        assert.equal(docId, _id3);
    
                        // Now we will add it back!
                        updateSync(
                            { _id: _id3 },
                            {
                                $set: { context },
                            }
                        );
                    }
                },
                added(docId, doc) {
                    if (initialAddBlast) {
                        return;
                    }

                    if (docId === _id6) {
                        // console.log('id6 has been added bc id3 has been removed.');
                    } else {
                        // console.log('id3 should be added back');
                        assert.equal(docId, _id3);
                        assert.isTrue(inChanged);
                        
                        observer.stop();
                        handle.stop();
                        done();
                    }
                }
            });

            initialAddBlast = false;
            const data = cursor.fetch();

            assert.lengthOf(data, limit);

            // We make sure that that the last element does not exist and is properly sorted.
            assert.isTrue(data.find(el => el._id === _id6) === undefined);
            // ids.forEach((_id, idx) => {
            //     assert.equal(data[limit - 1 - idx]._id, _id);
            // });

            updateSync(
                { _id: _id2 },
                {
                    $set: { number: 30 },
                }
            );
            updateSync(
                { _id: _id3 },
                {
                    $set: { context: 'limit-sort-test-invalidate' },
                }
            );
        });

        it('Should work with _ids direct processing and other filters present', async function(done) {
            const context = 'ids-process-test';
            const ids = await createSync([
                { context, meta: { student: false } },
                { context, meta: { student: true } },
                { context, meta: { student: true } },
            ]);

            const handle = subscribe({
                _id: { $in: ids },
                'meta.student': true,
            });

            await waitForHandleToBeReady(handle);

            let cursor = Collection.find({ context });
            const data = cursor.fetch();

            assert.lengthOf(data, 2);

            const observer = cursor.observeChanges({
                removed(docId) {
                    assert.equal(docId, ids[0]);

                    observer.stop();
                    handle.stop();
                    done();
                },
                added(docId, doc) {
                    if (docId == ids[0]) {
                        assert.equal(docId, ids[0]);
                        update(ids[0], {
                            $set: { 'meta.changing': true },
                        });
                    }
                },
                changed(docId, doc) {
                    if (docId == ids[0]) {
                        update(ids[0], {
                            $set: { 'meta.student': false },
                        });
                    }
                },
            });

            updateSync(ids[0], {
                $set: { 'meta.student': true },
            });
        });

        it('Should detect an insert with the default processor', async function(done) {
            const context = 'insert-default-processing' + Random.id();
            const handle = subscribe({ context });

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });

            let observer;
            observer = cursor.observeChanges({
                added(docId, doc) {
                    assert.equal(doc.context, context);
                    setTimeout(() => {
                        observer.stop();
                        handle.stop();
                        done();
                    }, 50);
                },
            });

            create({ context });
        });

        it('Should detect an update with string publication that should be id', async function(done) {
            const context = 'string-filters';
            let _id = await createSync({ context });
            const handle = subscribe(_id);

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });

            const observer = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(docId, _id);
                    assert.equal(doc.number, 10);
                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            update(_id, { $set: { number: 10 } });
        });

        it('Should work with deep nest specified fields', async function(done) {
            const context = 'edge-case-001';

            let _id = await createSync({
                context,
                passengers: [],
            });
            const handle = subscribe(_id, {
                fields: {
                    context: 1,
                    'passengers.name': 1,
                },
            });

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });
            const observer = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(docId, _id);
                    assert.lengthOf(doc.passengers, 1);
                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            update(_id, {
                $addToSet: {
                    passengers: {
                        _id: 'y2MECXDgr9ggiP5D4',
                        name: 'Marlee Nielsen',
                        phone: '',
                    },
                },
            });
        });

        it('Should work with upsert', async function(done) {
            const context = 'upsertion' + Random.id();
            const handle = subscribe({ context });

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });
            const observer = cursor.observeChanges({
                added(docId, doc) {
                    assert.equal(doc.number, 10);
                    upsert(
                        { context },
                        {
                            $set: {
                                number: 20,
                            },
                        }
                    );
                },
                changed(docId, doc) {
                    assert.equal(doc.number, 20);
                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            upsert(
                { context },
                {
                    context,
                    number: 10,
                }
            );
        });

        it('Should not detect a change if pushToRedis is false', async function(done) {
            const context = 'pushToRedis:false';
            const handle = subscribe({ context });

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });
            let _id;
            const observer = cursor.observeChanges({
                added(docId, doc) {
                    if (docId === _id) {
                        done('Should not be in added');
                    }
                },
                changed(docId, doc) {
                    if (docId === _id) {
                        done('Should not be in changed');
                    }
                },
                removed(docId) {
                    if (docId === _id) {
                        done('Should not be in changed');
                    }
                },
            });

            _id = await createSync(
                {
                    context,
                },
                { pushToRedis: false }
            );

            update(
                { _id },
                {
                    $set: { number: 10 },
                },
                { pushToRedis: false },
                (err, res) => {
                    remove({ _id }, { pushToRedis: false });
                }
            );

            setTimeout(() => {
                observer.stop();
                handle.stop();
                done();
            }, 200);
        });

        it('Should work correctly when disallowed fields are specified', async function(done) {
            const context = 'disallowed-fields-' + Random.id();
            const handle = subscribe(
                { context },
                {
                    fields: {
                        profile: 0,
                        'address.city': 0,
                        fullname: 0,
                    },
                }
            );

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });

            let _id;
            const observer = cursor.observeChanges({
                added(docId, doc) {
                    if (doc.context !== context) return;

                    assert.equal(doc.other, 'Public');
                    assert.isUndefined(doc.profile);
                    assert.isObject(doc.address);
                    assert.isString(doc.address.country);
                    assert.isUndefined(doc.address.city);
                    assert.isUndefined(doc.fullname);

                    update(
                        { _id: docId },
                        {
                            $set: {
                                'address.country': 'Testing',
                                fullname: 'Testing',
                                other: 'Publico',
                                newField: 'public',
                                'profile.firstName': 'John',
                            },
                        }
                    );
                },
                changed(docId, doc) {
                    assert.equal(doc.other, 'Publico');
                    assert.isUndefined(doc.profile);
                    assert.isObject(doc.address);
                    assert.equal(doc.address.country, 'Testing');
                    assert.equal(doc.newField, 'public');
                    assert.isUndefined(doc.address.city);
                    assert.isUndefined(doc.fullname);

                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            _id = await createSync({
                context,
                profile: {
                    name: 'Secret',
                },
                address: {
                    country: 'Country',
                    city: 'Secret',
                },
                fullname: 'Secret',
                other: 'Public',
            });
        });

        it('Should work correctly with the allowed fields only specified', async function(done) {
            const context = 'allowed-fields';
            const handle = subscribe(
                { context },
                {
                    fields: {
                        context: 1,
                        profile: 1,
                        'address.city': 1,
                        fullname: 1,
                    },
                }
            );

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });
            const observer = cursor.observeChanges({
                added(docId, doc) {
                    assert.isUndefined(doc.other);
                    assert.isObject(doc.profile);
                    assert.isObject(doc.address);
                    assert.isString(doc.address.city);
                    assert.isUndefined(doc.address.country);
                    assert.isString(doc.fullname);

                    update(
                        { _id: docId },
                        {
                            $set: {
                                'address.country': 'Testing',
                                fullname: 'Testing',
                                other: 'secret',
                                newField: 'secret',
                                'profile.firstName': 'John',
                            },
                        }
                    );
                },
                changed(docId, doc) {
                    assert.isUndefined(doc.other);
                    assert.isObject(doc.profile);
                    assert.equal(doc.profile.firstName, 'John');
                    assert.isUndefined(doc.newField);
                    assert.equal(doc.fullname, 'Testing');

                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            let _id = await createSync({
                context,
                profile: {
                    name: 'Public',
                },
                address: {
                    country: 'Country',
                    city: 'Public',
                },
                fullname: 'Public',
                other: 'Secret',
            });
        });

        it('Should work with limit-sort when only _id is specified', async function(done) {
            const context = Random.id();
            const handle = subscribe(
                { context },
                {
                    fields: {
                        context: 1,
                        _id: 1,
                    },
                    sort: { context: 1 },
                    limit: 20,
                }
            );

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });
            const observer = cursor.observeChanges({
                added(docId, doc) {
                    assert.isUndefined(doc.something);
                    assert.isTrue(_.keys(doc).length == 1);
                    update(
                        { _id: docId },
                        {
                            $set: {
                                something: false,
                            },
                        }
                    );

                    done();
                },
                changed(docId, doc) {
                    done(
                        'Should not be in changed event because nothing changed'
                    );
                },
            });

            create({
                context,
                something: true,
            });
        });

        it('Should work properly with $unset', async function(done) {
            const context = 'test-$unset';
            const handle = subscribe({ context });

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });
            const observer = cursor.observeChanges({
                added(docId, doc) {
                    assert.isTrue(doc.something);

                    setTimeout(() => {
                        update(
                            { _id: docId },
                            {
                                $unset: {
                                    something: '',
                                },
                            }
                        );
                    }, 50);
                },
                changed(docId, doc) {
                    assert.isTrue('something' in doc);
                    assert.isUndefined(doc.something);
                    remove({ _id: docId });
                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            create({
                context,
                something: true,
            });
        });

        it('Should work when updating deep array when it is specified as a field', async function(done) {
            const context = `deep-array-objects-${Random.id()}`;

            let handle = subscribe(
                { context },
                {
                    fields: {
                        context: 1,
                        'deep.deep.array': 1,
                    },
                }
            );

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ context });

            const observer = cursor.observeChanges({
                added(docId, doc) {
                    assert.isArray(doc.deep.deep.array);
                    assert.lengthOf(doc.deep.deep.array, 6);
                    update(
                        {
                            _id: docId,
                            'deep.deep.array': 6,
                        },
                        {
                            $set: {
                                'deep.deep.array.$': 20,
                            },
                        }
                    );
                },
                changed(docId, doc) {
                    assert.isArray(doc.deep.deep.array);
                    assert.lengthOf(doc.deep.deep.array, 6);
                    doc.deep.deep.array.forEach(number => {
                        assert.isNumber(number);
                    });
                    assert.isTrue(_.contains(doc.deep.deep.array, 20));

                    observer.stop();
                    handle.stop();
                    done();
                },
            });

            create({
                context,
                deep: {
                    deep: {
                        array: [1, 2, 3, 4, 5, 6],
                    },
                },
            });
        });

        it('Should work when updating a specific element in an array', async function(done) {
            const context = 'update-specific-in-arrays';

            let handle = subscribe(
                { context },
                {
                    fields: {
                        context: 1,
                        passengers: 1,
                    },
                }
            );

            await waitForHandleToBeReady(handle);
            const cursor = Collection.find({ context });

            const observer = cursor.observeChanges({
                added(docId, doc) {
                    update(
                        { _id: docId },
                        {
                            $set: {
                                'passengers.1.phone': 'ZZZ',
                            },
                        }
                    );
                },
                changed(docId, doc) {
                    doc.passengers.forEach(passenger => {
                        if (passenger.previous === 'YYY') {
                            assert.equal(passenger.phone, 'ZZZ');
                            observer.stop();
                            handle.stop();
                            done();
                        }
                    });
                },
            });

            create({
                context,
                passengers: [
                    {
                        previous: 'XXX',
                        phone: 'XXX',
                    },
                    {
                        previous: 'YYY',
                        phone: 'YYY',
                    },
                ],
            });
        });

        it('Should work with $elemMatch query selector', async function(done) {
            const context = 'work-with-elemMatch-' + Random.id();

            let handle = subscribe({
                context,
                emails: {
                    $elemMatch: {
                        address: 'x@x.com',
                    },
                },
            });

            await waitForHandleToBeReady(handle);
            const cursor = Collection.find({
                context,
            });

            const observer = cursor.observeChanges({
                added(docId, doc) {
                    assert.isArray(doc.emails);
                    assert.equal('x@x.com', doc.emails[0].address);
                    handle.stop();
                    observer.stop();
                    done();
                },
            });

            create({
                context,
                emails: [
                    {
                        address: 'x@x.com',
                    },
                ],
            });
        });

        it('Should detect 3rd level nesting changes', async function(done) {
            const context = 'deep-level-nesting-' + Random.id();

            let handle = subscribe({
                context,
            });

            await waitForHandleToBeReady(handle);
            const cursor = Collection.find({
                context,
            });

            const observer = cursor.observeChanges({
                added(docId, doc) {
                    update(docId, {
                        $set: {
                            'item.profile.name': 'Elena Smith',
                        },
                    });
                },
                changed(docId, doc) {
                    assert.isObject(doc.item);
                    assert.equal('Elena Smith', doc.item.profile.name);
                    done();
                },
            });

            create({
                context,
                item: {
                    profile: {
                        name: 'John Smith',
                    },
                },
            });
        });

        it('Should work with a filter on a subfield and a top field specified', async function(done) {
            _id = await createSync({
                master: {
                    sub: 'TEST',
                    sub2: 1,
                    sub3: 1,
                },
            });

            let handle = subscribe(
                {
                    _id,
                    'master.sub': 'TEST',
                },
                {
                    fields: {
                        master: 1,
                    },
                }
            );

            await waitForHandleToBeReady(handle);

            const cursor = Collection.find({ _id });
            const document = Collection.findOne({ _id });
            assert.isObject(document.master);
            assert.equal(document.master.sub, 'TEST');
            assert.equal(document.master.sub2, 1);
            assert.equal(document.master.sub3, 1);

            let observeChangesHandle = cursor.observeChanges({
                changed(docId, doc) {
                    assert.equal(doc.master.sub2, 2);
                    handle.stop();
                    observeChangesHandle.stop();
                    done();
                },
            });

            update(
                { _id },
                {
                    $set: { 'master.sub2': 2 },
                }
            );
        });
    });
});
