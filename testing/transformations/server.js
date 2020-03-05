import { assert } from 'chai';
import { Items } from './collections';

Meteor.publish('transformations_items', function() {
    return Items.find();
});
Meteor.publish('transformations_items_custom', function() {
    return Items.find(
        {
            context: 'client',
        },
        {
            transform(doc) {
                doc.customServerTransform = true;
                return doc;
            },
        }
    );
});

Meteor.methods({
    transformations_boot() {
        Items.remove({});
        Items.insert({ context: 'client', title: 'hello1' });
    },
});

describe('Transformations - Server Test', function() {
    it('Should transform properly', function(done) {
        const context = Random.id();
        const handle = Items.find({
            context,
        }).observeChanges({
            added(docId, doc) {
                assert.isTrue(doc.defaultServerTransform);
                handle.stop();
                done();
            },
        });

        Items.insert({ context, title: 'hello2' });
    });
});
