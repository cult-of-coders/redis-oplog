import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { Children, Items } from './collections';
import { waitForHandleToBeReady } from '../lib/sync_utils';

describe('Publish Composite', () => {
    it('Should be able to detect updates on parent element', function (done) {
        Meteor.callAsync('publish_composite.load_fixtures')
            .then(function () {
                const handle = Meteor.subscribe('items_publish_composite');
                waitForHandleToBeReady(handle)
                    .then(async function () {
                        const cursor = Items.find();
                        const observer = await cursor.observeChanges({
                            async changed(docId, doc) {
                                assert.equal(doc.name, 'Other Name');
                                const firstChild = (await Children.find({ itemId: docId }).fetchAsync())[0];
                                await Meteor.callAsync('publish_composite.children.update', firstChild._id, {
                                    $set: { name: 'Other Name' },
                                });
                            },
                        });

                        const item = (await cursor.fetchAsync())[0];
                        assert.isObject(item);
                        const childCursor = Children.find({ itemId: item._id });
                        const childObserver = await childCursor.observeChanges({
                            changed(docId, doc) {
                                assert.equal(doc.name, 'Other Name');

                                done();
                                handle.stop();
                                observer.stop();
                            },
                        });

                        await Meteor.callAsync('publish_composite.items.update', item._id, {
                            $set: { name: 'Other Name' },
                        });
                    })
            })
            .catch(function (err) {
                done(err);
            });
    })
});
