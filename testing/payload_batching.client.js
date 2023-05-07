import { Random } from 'meteor/random';
import {Collections, config} from './boot';
import helperGenerator from './lib/helpers';
import Config from '../lib/config';

const Collection = Collections['Standard'];

describe('Redis Payload Batching', function () {
    const {
        update,
        createSync,
        subscribe,
        waitForHandleToBeReady
    } = helperGenerator(config['Standard'].suffix);

    it('Should process all the updates at once since we are not waiting more than the debounceInterval between updates', async function(done) {
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
                    }, 200);
                }
            },
        });
        
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

    it('Should correctly process each update separately since we are waiting longer than the debounce interval between updates', async function(done) {
        const docId = Random.id();
        let handle = subscribe({ _id: docId });
        // We wait twice the debounce interval to ensure that any payloads that were received
        // and debounced by the server would have been processed
        const sleepInterval = 2 * Config.debounceInterval; 
        // Execute multiple updates to confirm that those updates are not being batched
        const numUpdates = 3;
        // Since we are sleeping more than the debounce interval we expect our total number 
        // of changes received from the server to equal the number of updates
        const expectedChanges = numUpdates;

        await createSync({ _id: docId, value: -1 });

        await waitForHandleToBeReady(handle);

        let changes = 0;
        Collection.find({ _id: docId }).observeChanges({
            changed() {
                changes += 1;

                // ensure we receive the expected number of change events
                if (changes === expectedChanges) {
                    done();
                }
            },
        });
        
        // kick off several updates
        for (let i = 0; i < numUpdates; i++) {
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
            await new Promise(resolve => setTimeout(resolve, sleepInterval));
        }
    });

    it('Should correctly use maxWait to batch changes if we exceed the first debounce window', async function(done) {
        const docId = Random.id();
        let handle = subscribe({ _id: docId });
        // We set a short sleep interval here because we want to process more than one
        // update in the same batch
        const sleepInterval = 30;
        // We execute 101 updates here so that the total execution time here is 30ms * 101 updates = 3030ms
        // This ensures that our final update happens after the maxWait and should be processed in two batches
        const numUpdates = 101;
        // Since we should see our updates processed in two batches, we expect to receive only two changed events
        // from the server
        const expectedChanges = 2;
        
        await createSync({ _id: docId, value: -1 });

        await waitForHandleToBeReady(handle);

        let changes = 0;
        Collection.find({ _id: docId }).observeChanges({
            changed() {
                changes += 1;

                // ensure we don't receive more updates than expected
                if (changes === expectedChanges) {
                    setTimeout(() => {
                        if (changes === expectedChanges) done();
                        else throw new Error('Too many changes')
                    }, 200);
                }
            },
        })
        
        // kick off several updates
        for (let i = 0; i < numUpdates; i++) {
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
            await new Promise(resolve => setTimeout(resolve, sleepInterval));
        }
    }).timeout(5000);
});