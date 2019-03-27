import { SmartIds } from './collections';

Meteor.publish('smart_ids', function(filters = {}) {
    return SmartIds.find(filters);
});

Meteor.methods({
    smart_ids_reset(doc) {
        SmartIds.remove({});
        const id1 = SmartIds.insert({
            text: 'John Doe'
        });
        const id2 = SmartIds.insert({
            text: 'John Shmoe'
        });

        return [id1, id2];
    },
    smart_ids_insert(doc) {
        SmartIds.insert(doc);
    }
});
