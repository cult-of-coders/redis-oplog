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
    async 'collection_defaults.items.insert'(...args) {
        return await Items.insertAsync(...args);
    },
    async 'collection_defaults.items.update'(...args) {
        return await Items.updateAsync(...args);
    },
    async 'collection_defaults.items.remove'(...args) {
        return await Items.removeAsync(...args);
    },
});
