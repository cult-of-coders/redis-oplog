import { assert } from 'chai';
import { Items } from './collections';
import { _ } from 'meteor/underscore';
import { waitForHandleToBeReady, callWithPromise } from '../lib/sync_utils';
import { Random } from 'meteor/random';
import './boot';

describe('Optimistic UI', () => {
    it('Should not cause a flicker with method calls', async function(done) {
        const context = Random.id();

        const itemId = await callWithPromise('optimistic_ui.items.insert', {
            context,
            liked: ['ZZZ'],
        });

        const handle = Meteor.subscribe('optimistic_ui.items', { _id: itemId });
        await waitForHandleToBeReady(handle);

        const cursor = Items.find({ _id: itemId });

        let alreadyIn = 0;
        const observer = cursor.observeChanges({
            changed(docId, doc) {
                alreadyIn++;
                if (alreadyIn > 1) {
                    done('A flicker was caused.');
                }

                assert.lengthOf(doc.liked, 2);
                assert.isTrue(_.contains(doc.liked, 'XXX'));

                setTimeout(() => {
                    handle.stop();
                    observer.stop();
                    done();
                }, 200);
            },
        });

        const item = _.first(cursor.fetch());
        assert.isObject(item);

        Meteor.call('optimistic_ui.items.update', item._id, {
            $addToSet: {
                liked: 'XXX',
            },
        });
    });

    it('Should not cause a flicker with isomorphic calls', async function(done) {
        const context = Random.id();

        const itemId = Items.insert({
            context,
            liked: ['YYY'],
        });

        const handle = Meteor.subscribe('optimistic_ui.items', { _id: itemId });
        await waitForHandleToBeReady(handle);

        const cursor = Items.find({ _id: itemId });

        let alreadyIn = 0;
        const observer = cursor.observeChanges({
            changed(docId, doc) {
                alreadyIn++;
                if (alreadyIn > 1) {
                    done('A flicker was caused.');
                }

                assert.lengthOf(doc.liked, 2);
                assert.isTrue(_.contains(doc.liked, 'XXX'));

                setTimeout(() => {
                    handle.stop();
                    observer.stop();
                    done();
                }, 200);
            },
        });

        const item = _.first(cursor.fetch());
        assert.isObject(item);

        Items.update(item._id, {
            $addToSet: {
                liked: 'XXX',
            },
        });
    });
});
