import { Counter } from 'meteor/natestrauser:publish-performant-counts'
import {Items} from './collections';

Meteor.publish('performant_counts', function () {
    return new Counter(
        'items_count',
        Items.find({}),
        100
    )
});

Meteor.methods({
    'performant_counts_boot'() {
        Items.remove({});

        Items.insert({name: 'Item 1'});
        Items.insert({name: 'Item 2'});
        Items.insert({name: 'Item 3'});
    },
    'performant_counts_add'() {
        Items.insert({name: 'Item'});
    }
});