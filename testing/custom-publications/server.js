import {Items} from './collections';

Meteor.publish('custom_publications', function () {
    const cursor = Items.find();
    cursor.forEach(doc => {
        this.added(Items._name, doc._id, doc);
    });

    this.ready();
});

Meteor.methods({
    'custom_publications_boot'() {
        Items.remove({});

        Items.insert({name: 'Item 1'});
        Items.insert({name: 'Item 2'});
        Items.insert({name: 'Item 3'});
    }
});