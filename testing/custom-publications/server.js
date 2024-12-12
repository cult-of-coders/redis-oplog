import { Meteor } from 'meteor/meteor';
import { Items } from './collections';

Meteor.publish('custom_publications', async function () {
    const cursor = Items.find();
    await cursor.forEachAsync(doc => {
        this.added(Items._name, doc._id, doc);
    });

    this.ready();
});

Meteor.methods({
    async 'custom_publications_boot'() {
        await Items.removeAsync({});

        await Items.insertAsync({name: 'Item 1'});
        await Items.insertAsync({name: 'Item 2'});
        await Items.insertAsync({name: 'Item 3'});
    }
});
