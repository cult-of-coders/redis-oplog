import { Random } from 'meteor/random';
import { assert } from 'chai';
import {Collections, config} from './boot';
import helperGenerator from './lib/helpers';

const Collection = Collections['Standard'];

describe.only('Redis Payload Batching', function () {
    const {
        update,
        createSync,
        subscribe,
        waitForHandleToBeReady
    } = helperGenerator(config['Standard'].suffix);

    it('Ensure config debounce interval works as expected part 1', async function(done) {
        const docId = Random.id();
        let handle = subscribe({ _id: docId });

        await createSync({ _id: docId, value: -1 });

        await waitForHandleToBeReady(handle);

        let changes = 0;
        const expectedChanges = 1;
        Collection.find({ _id: docId }).observeChanges({
            changed() {
                changes += 1;

                // ensure we don't receive more updates than expected
                if (changes === expectedChanges) {
                    setTimeout(() => {
                        if (changes === expectedChanges) done();
                        else throw new Error('Too many changes')
                    }, 200)
                }
            },
        })
        
        // kick off several updates
        for (let i = 0; i < 10; i++) {
            update(
                { _id: docId },
                {
                    $set: {
                        value: i,
                    },
                },
                { optimistic: false, pushToRedis: true }
            );
        }
    });

    it('Ensure config debounce interval works as expected part 2', async function(done) {
        const docId = Random.id();
        let handle = subscribe({ _id: docId });

        await createSync({ _id: docId, value: -1 });

        await waitForHandleToBeReady(handle);

        let changes = 0;
        const expectedChanges = 3;
        Collection.find({ _id: docId }).observeChanges({
            changed() {
                changes += 1;

                // ensure we receive the expected number of change events
                if (changes === expectedChanges) {
                    done();
                }
            },
        })
        
        // kick off several updates
        for (let i = 0; i < expectedChanges; i++) {
            update(
                { _id: docId },
                {
                    $set: {
                        value: i,
                    },
                },
                { optimistic: false, pushToRedis: true }
            );
            // wait till new debounce interval
            await new Promise(resolve => setTimeout(resolve, 200))
        }
    });

    it('Ensure config max wait works as expected', async function(done) {
        const docId = Random.id();
        let handle = subscribe({ _id: docId });

        await createSync({ _id: docId, value: -1 });

        await waitForHandleToBeReady(handle);

        let changes = 0;
        const expectedChanges = 2;
        Collection.find({ _id: docId }).observeChanges({
            changed() {
                changes += 1;

                // ensure we don't receive more updates than expected
                if (changes === expectedChanges) {
                    setTimeout(() => {
                        if (changes === expectedChanges) done();
                        else throw new Error('Too many changes')
                    }, 200)
                }
            },
        })
        
        // kick off several updates
        for (let i = 0; i < 101; i++) {
            update(
                { _id: docId },
                {
                    $set: {
                        value: i,
                    },
                },
                { optimistic: false, pushToRedis: true }
            );
            // wait till new debounce interval
            await new Promise(resolve => setTimeout(resolve, 30))
        }
    }).timeout(5000);
});