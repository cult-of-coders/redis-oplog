import { assert } from 'chai';
import { Items } from './collections';
import { waitForHandleToBeReady, callWithPromise } from '../lib/sync_utils';
import { Random } from 'meteor/random';

describe('Collection Defaults', () => {
    it('Should detect changes based on mutation defaults', function (done) {
        const context = Random.id();
        const handle = Meteor.subscribe('collection_defaults.items', { context });
        waitForHandleToBeReady(handle).then(function () {
            const cursor = Items.find({});

            const observer = cursor.observeChanges({
                added(docId, doc) {
                    assert.isObject(doc);
                    callWithPromise('collection_defaults.items.update', {
                        _id: docId
                    }, {
                        $set: {
                            number: 10
                        }
                    })
                },
                changed(docId, doc) {
                    assert.equal(doc.number, 10);
                    handle.stop();
                    observer.stop();
                    done();
                }
            });

            callWithPromise('collection_defaults.items.insert', {
                text: 'hello',
                context
            });
        });
    });
    it('Should not detect changes based if a namespace is specified', function (done) {
        const context = Random.id();

        const handle = Meteor.subscribe('collection_defaults.items', { context }, {
            namespace: 'someothernamespace'
        });

        waitForHandleToBeReady(handle).then(function () {
            const cursor = Items.find({});

            const observer = cursor.observeChanges({
                added(docId, doc) {
                    done('It should not be here')
                },
            });

            callWithPromise('collection_defaults.items.insert', {
                text: 'hello again',
                context
            }).then(function () {
                setTimeout(function () {
                    handle.stop();
                    observer.stop();
                    done();
                }, 200);
            });
        });
    });
});
