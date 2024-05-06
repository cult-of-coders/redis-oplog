import { Meteor } from 'meteor/meteor';
import { Items, Children } from './collections';
import loadFixtures from './loadFixtures';

Items.allow({
    insertAsync: () => true,
    updateAsync: () => true,
    removeAsync: () => true,
    insert: () => true,
    update: () => true,
    remove: () => true,
});

Children.allow({
    insertAsync: () => true,
    updateAsync: () => true,
    removeAsync: () => true,
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
                return Children.find({ itemId: item._id });
            }
        }
    ]
});

Meteor.methods({
    async 'publish_composite.load_fixtures'() {
        await loadFixtures();
    },
    'publish_composite.items.insert'(...args) {
        return Items.insertAsync(...args)
    },
    'publish_composite.items.update'(...args) {
        return Items.updateAsync(...args)
    },
    'publish_composite.items.remove'(...args) {
        return Items.removeAsync(...args)
    },
    'publish_composite.children.insert'(...args) {
        return Children.insertAsync(...args)
    },
    'publish_composite.children.update'(...args) {
        return Children.updateAsync(...args)
    },
    'publish_composite.children.remove'(...args) {
        return Children.removeAsync(...args)
    }
});
