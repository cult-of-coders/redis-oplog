import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { Items } from './collections';
import { waitForHandleToBeReady } from '../lib/sync_utils';
import { Random } from 'meteor/random';
import './boot';

describe('Optimistic UI', () => {
    it('Should not cause a flicker with method calls', async function () {
        this.timeout(0)
        const context = Random.id();

        return new Promise(async (resolve, reject) => {

            await Meteor.callAsync('optimistic_ui.items.insert', {
                context,
                liked: ['ZZZ'],
            })
                .then(async function (itemId) {
                    itemId = await itemId.stubValuePromise;
                    const handle = Meteor.subscribe('optimistic_ui.items', { _id: itemId });

                    await waitForHandleToBeReady(handle)

                    const cursor = Items.find({ _id: itemId });

                    let alreadyIn = 0;
                    const observer = cursor.observeChanges({
                        changed(docId, doc) {
                            alreadyIn++;
                            if (alreadyIn > 1) {
                                handle.stop();
                                observer.stop();
                                reject(new Error(`A flicker was caused.`));
                                return
                            }

                            assert.lengthOf(doc.liked, 2);
                            assert.isTrue(doc.liked.includes('XXX'));

                            setTimeout(() => {
                                handle.stop();
                                observer.stop();
                                resolve();
                            }, 200);
                        },
                    });

                    const item = cursor.fetch()[0];
                    assert.isObject(item);

                    await Meteor.callAsync('optimistic_ui.items.update', item._id, {
                        $addToSet: {
                            liked: 'XXX',
                        },
                    })
                });
        });
    });

    it('Should not cause a flicker with isomorphic calls', function (done) {
        const context = Random.id();

        const itemId = Items.insert({
            context,
            liked: ['YYY'],
        });

        const handle = Meteor.subscribe('optimistic_ui.items', { _id: itemId });
        waitForHandleToBeReady(handle).then(function () {
            const cursor = Items.find({ _id: itemId });

            let alreadyIn = 0;
            const observer = cursor.observeChanges({
                changed(docId, doc) {
                    alreadyIn++;
                    if (alreadyIn > 1) {
                        done('A flicker was caused.');
                    }

                    assert.lengthOf(doc.liked, 2);
                    assert.isTrue(doc.liked.includes('XXX'));

                    setTimeout(() => {
                        handle.stop();
                        observer.stop();
                        done();
                    }, 200);
                },
            });

            const item = cursor.fetch()[0];
            assert.isObject(item);

            Items.update(item._id, {
                $addToSet: {
                    liked: 'XXX',
                },
            });
        });
    });
});
