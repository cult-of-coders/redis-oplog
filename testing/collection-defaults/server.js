import { Meteor } from 'meteor/meteor'
import { Items } from './collections';

if (Meteor.isServer) {
    Meteor.publish('collection_defaults.items', function(...args) {
        return Items.find(...args);
    });
}

Items.configureRedisOplog({
    mutation(options) {
        options.namespace = 'testnamespace';
    },
    cursor(options) {
        if (!options.namespace) {
            options.namespace = 'testnamespace';
        }
    },
});

Meteor.methods({
    'collection_defaults.items.insert'(...args) {
        return Items.insertAsync(...args);
    },
    'collection_defaults.items.update'(...args) {
        return Items.updateAsync(...args);
    },
    'collection_defaults.items.remove'(...args) {
        return Items.removeAsync(...args);
    },
});
