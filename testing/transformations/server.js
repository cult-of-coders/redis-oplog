import {Items} from './collections';

Meteor.publish('transformations_items', function () {
    return Items.find();
});
Meteor.publish('transformations_items_custom', function () {
    return Items.find({}, {
        transform(doc) {
            doc.customServerTransform = true;
            return doc;
        }
    });
});

Meteor.methods({
    'transformations_boot'() {
        Items.remove({});
        Items.insert({title: 'hello1'});
    }
});