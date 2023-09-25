import { Mongo } from 'meteor/mongo';

const Campaigns = new Mongo.Collection('campaign_searches');

if (Meteor.isServer) {
    Campaigns.createIndexAsync({
        text: 'text'
    }).catch(err => {
        console.error(err);
    });
}

export { Campaigns };
