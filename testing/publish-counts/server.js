import { Meteor } from 'meteor/meteor';
import { Counter } from 'meteor/natestrauser:publish-performant-counts'
import { Items } from './collections';

Meteor.publish('performant_counts', function () {
    return new Counter(
        'items_count',
        Items.find({}),
        100
    )
});

Meteor.methods({
    async 'performant_counts_boot'() {
        await Items.removeAsync({});

        await Items.insertAsync({name: 'Item 1'});
        await Items.insertAsync({name: 'Item 2'});
        await Items.insertAsync({name: 'Item 3'});
    },
    async 'performant_counts_add'() {
        await Items.insertAsync({name: 'Item'});
    }
});
