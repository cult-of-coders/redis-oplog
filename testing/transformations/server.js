import { Meteor } from 'meteor/meteor';
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
    async transformations_boot() {
        await Items.removeAsync({});
        await Items.insertAsync({ context: 'client', title: 'hello1' });
    },
});

describe('Transformations - Server Test', function() {
    it('Should transform properly', async function(done) {
        const context = Random.id();
        const handle = await Items.find({
            context,
        }).observeChanges({
            async added(docId, doc) {
                assert.isTrue(doc.defaultServerTransform);
                await handle.stop();
                done();
            },
        });

        await Items.insertAsync({ context, title: 'hello2' });
    });
});
