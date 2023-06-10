import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { Items, Children } from './collections';
import { waitForHandleToBeReady, callWithPromise } from '../lib/sync_utils';

describe('Publish Composite', () => {
    it('Should be able to detect updates on parent element', function (done) {
        callWithPromise('publish_composite.load_fixtures').then(function () {
            const handle = Meteor.subscribe('items_publish_composite');
            waitForHandleToBeReady(handle).then(function () {
                const cursor = Items.find();

                const observer = cursor.observeChanges({
                    changed(docId, doc) {
                        assert.equal(doc.name, 'Other Name');
                        const firstChild = Children.find({ itemId: docId }).fetch()[0];

                        Meteor.call('publish_composite.children.update', firstChild._id, {
                            $set: { name: 'Other Name' }
                        });
                    }
                });

                const item = cursor.fetch()[0];
                assert.isObject(item);

                const childCursor = Children.find({ itemId: item._id });
                const childObserver = childCursor.observeChanges({
                    changed(docId, doc) {
                        assert.equal(doc.name, 'Other Name');

                        done();
                        handle.stop();
                        observer.stop();
                    }
                });

                callWithPromise('publish_composite.items.update', item._id, {
                    $set: { name: 'Other Name' }
                });
            });
        });
    })
});
