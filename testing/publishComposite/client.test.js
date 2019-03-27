import { assert } from 'chai';
import {Items, Children} from './collections';
import {_} from 'meteor/underscore';
import {waitForHandleToBeReady, callWithPromise} from '../lib/sync_utils';

describe('Publish Composite', () => {
    it('Should be able to detect updates on parent element', async function (done) {
        await callWithPromise('publish_composite.load_fixtures');

        const handle = Meteor.subscribe('items_publish_composite');
        await waitForHandleToBeReady(handle);

        const cursor = Items.find();

        const observer = cursor.observeChanges({
            changed(docId, doc) {
                assert.equal(doc.name, 'Other Name');
                const firstChild = Children.find({itemId: docId}).fetch()[0];

                Meteor.call('publish_composite.children.update', firstChild._id, {
                    $set: {name: 'Other Name'}
                });
            }
        });

        const item = _.first(cursor.fetch());
        assert.isObject(item);

        const childCursor = Children.find({itemId: item._id});
        const childObserver = childCursor.observeChanges({
            changed(docId, doc) {
                assert.equal(doc.name, 'Other Name');

                done();
                handle.stop();
                observer.stop();
            }
        });

        await callWithPromise('publish_composite.items.update', item._id, {
            $set: {name: 'Other Name'}
        });
    })
});