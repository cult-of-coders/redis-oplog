import { assert } from 'chai';
import {Collections, config} from './boot';
import helperGenerator from './lib/helpers';

const Collection = Collections['Standard'];

describe('Client-side Mutators', function () {
    const {
        subscribe,
        fetchSync,
        waitForHandleToBeReady
    } = helperGenerator(config['Standard'].suffix);

    it('Should detect an insert/update and removal from client side', async function (done) {
        const handle = subscribe({
            client_side_mutators: true
        });

        await waitForHandleToBeReady(handle);

        cursor = Collection.find({ client_side_mutators: true });

        let testDocId, inChanged = false, inAdded = false, inRemoved = false;
        const observer = cursor.observeChanges({
            added(docId, doc) {
                if (inAdded) {
                    return;
                }
                inAdded = true;

                testDocId = docId;
                assert.equal(doc.number, 5);

                setTimeout(async () => {
                    const result = await fetchSync({ _id: docId });
                    assert.isArray(result);
                    assert.lengthOf(result, 1);
                    assert.equal(result[0].number, 5);

                    Collection.update(docId, {
                        $set: {number: 10}
                    })
                }, 100)
            },
            changed(docId, doc) {
                if (inChanged) {
                    return;
                }
                inChanged = true;
                assert.equal(docId, testDocId);
                assert.equal(doc.number, 10);

                setTimeout(async () => {
                    const result = await fetchSync({_id: docId});
                    assert.lengthOf(result, 1);
                    assert.equal(result[0].number, 10);

                    Collection.remove(docId)
                }, 100);
            },
            removed(docId) {
                if (inRemoved) {
                    return;
                }
                inRemoved = true;
                assert.equal(docId, testDocId);
                done();
            }
        });

        Collection.insert({
            client_side_mutators: true,
            number: 5
        });
    });
});