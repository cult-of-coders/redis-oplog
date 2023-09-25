import { Meteor } from 'meteor/meteor';
import { Items } from './collections';

if (Meteor.isServer) {
    Meteor.publish('optimistic_ui.items', function(...args) {
        return Items.find(...args);
    });
}

Items.allow({
    insert: () => true,
    update: () => true,
    remove: () => true,
});

// Meteor.publishComposite.enableDebugLogging();

Meteor.methods({
    async 'optimistic_ui.items.insert'(...args) {
        return await Items.insertAsync(...args, { optimistic: true });
    },
    async 'optimistic_ui.items.update'(...args) {
        return await Items.updateAsync(...args, { optimistic: true });
    },
    async 'optimistic_ui.items.remove'(...args) {
        return await Items.removeAsync(...args, { optimistic: true });
    },
});
