import { Meteor } from 'meteor/meteor';
import { SmartIds } from './collections';

Meteor.publish('smart_ids', function(filters = {}) {
    return SmartIds.find(filters);
});

Meteor.methods({
    async smart_ids_reset(doc) {
        await SmartIds.removeAsync({});
        const id1 = await SmartIds.insertAsync({
            text: 'John Doe'
        });
        const id2 = await SmartIds.insertAsync({
            text: 'John Shmoe'
        });

        return [id1, id2];
    },
    async smart_ids_insert(doc) {
        await SmartIds.insertAsync(doc);
    }
});
