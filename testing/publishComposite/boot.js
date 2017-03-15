import { Items, Children } from './collections';
import loadFixtures from './loadFixtures';

Items.allow({
    insert: () => true,
    update: () => true,
    remove: () => true,
});

Children.allow({
    insert: () => true,
    update: () => true,
    remove: () => true,
});

// Meteor.publishComposite.enableDebugLogging();

Meteor.publishComposite('items_publish_composite', {
    find() {
        return Items.find()
    },
    children: [
        {
            find(item) {
                return Children.find({itemId: item._id});
            }
        }
    ]
});

Meteor.methods({
    'publish_composite.load_fixtures'() {
        loadFixtures();
    },
    'publish_composite.items.insert'(...args) {
        return Items.insert(...args)
    },
    'publish_composite.items.update'(...args) {
        return Items.update(...args)
    },
    'publish_composite.items.remove'(...args) {
        return Items.remove(...args)
    },
    'publish_composite.children.insert'(...args) {
        return Children.insert(...args)
    },
    'publish_composite.children.update'(...args) {
        return Children.update(...args)
    },
    'publish_composite.children.remove'(...args) {
        return Children.remove(...args)
    }
});