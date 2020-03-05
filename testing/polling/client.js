import { assert } from 'chai';
import { Campaigns } from './collections';
import { Meteor } from 'meteor/meteor';

describe('Polling', function() {
    it('Should work!', async function(done) {
        await Meteor.callWithPromise('campaign_search_reset');

        const pollingIntervalMs = 100;

        const handle = Meteor.subscribe(
            'campaign_search',
            'John',
            pollingIntervalMs,
            function() {
                const results = Campaigns.find().fetch();

                assert.lengthOf(results, 2);

                Meteor.call(
                    'campaign_search_insert',
                    {
                        text: 'John Broman'
                    },
                    function() {
                        setTimeout(() => {
                            const results = Campaigns.find().fetch();
                            assert.lengthOf(results, 3);

                            done();
                        }, pollingIntervalMs + 100);
                    }
                );
            }
        );
    });
});
