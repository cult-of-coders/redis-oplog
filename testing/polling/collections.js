import { Mongo } from 'meteor/mongo';

const Campaigns = new Mongo.Collection('campaign_searches');

if (Meteor.isServer) {
    Campaigns.createIndexAsync({
        text: 'text'
    });
}

export { Campaigns };
