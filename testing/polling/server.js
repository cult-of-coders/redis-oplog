import { Campaigns } from './collections';

Meteor.publish('campaign_search', function(search, pollingIntervalMs = 100) {
    var query = { $text: { $search: search } };
    return Campaigns.find(query, {
        disableOplog: true,
        pollingIntervalMs
    });
});

Meteor.methods({
    campaign_search_reset(doc) {
        Campaigns.remove({});
        Campaigns.insert({
            text: 'John Doe'
        });
        Campaigns.insert({
            text: 'John Shmoe'
        });
    },
    campaign_search_insert(doc) {
        Campaigns.insert(doc);
    }
});
