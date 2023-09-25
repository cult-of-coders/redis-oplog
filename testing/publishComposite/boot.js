import { Meteor } from 'meteor/meteor';
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
    async 'publish_composite.load_fixtures'() {
        await loadFixtures();
    },
    async 'publish_composite.items.insert'(...args) {
        return await Items.insertAsync(...args)
    },
    async 'publish_composite.items.update'(...args) {
        return await Items.updateAsync(...args)
    },
    async 'publish_composite.items.remove'(...args) {
        return await Items.removeAsync(...args)
    },
    async 'publish_composite.children.insert'(...args) {
        return Children.insertAsync(...args)
    },
    async 'publish_composite.children.update'(...args) {
        return Children.updateAsync(...args)
    },
    async 'publish_composite.children.remove'(...args) {
        return Children.removeAsync(...args)
    }
});
