import { Meteor } from 'meteor/meteor';
import { Items } from './collections';

if (Meteor.isServer) {
    Meteor.publish('optimistic_ui.items', function(...args) {
        return Items.find(...args);
    });
}

Items.allow({
    insertAsync: () => true,
    updateAsync: () => true,
    removeAsync: () => true,
    insert: () => true,
    update: () => true,
    remove: () => true,
});

// Meteor.publishComposite.enableDebugLogging();

Meteor.methods({
    'optimistic_ui.items.insert'(...args) {
        return Items.insert(...args, { optimistic: true });
    },
    'optimistic_ui.items.update'(...args) {
        return Items.update(...args, { optimistic: true });
    },
    'optimistic_ui.items.remove'(...args) {
        return Items.remove(...args, { optimistic: true });
    },
});
