import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { Items } from './collections';
import { waitForHandleToBeReady, callWithPromise } from '../lib/sync_utils';
import { Random } from 'meteor/random';
import './boot';

describe('Optimistic UI', () => {
    it('Should not cause a flicker with method calls', function (done) {
        const context = Random.id();

        callWithPromise('optimistic_ui.items.insert', {
            context,
            liked: ['ZZZ'],
        }).then(function (itemId) {
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

                Meteor.call('optimistic_ui.items.update', item._id, {
                    $addToSet: {
                        liked: 'XXX',
                    },
                });
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
