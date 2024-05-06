import { Meteor } from 'meteor/meteor';
import { Campaigns } from './collections';

Meteor.publish('campaign_search', function(search, pollingIntervalMs = 100) {
    var query = { $text: { $search: search } };
    return Campaigns.find(query, {
        disableOplog: true,
        pollingIntervalMs
    });
});

Meteor.methods({
    async campaign_search_reset(doc) {
        await Campaigns.removeAsync({});
        await Campaigns.insertAsync({
            text: 'John Doe'
        });
        await Campaigns.insertAsync({
            text: 'John Shmoe'
        });
    },
    async campaign_search_insert(doc) {
        await Campaigns.insertAsync(doc);
    }
});
