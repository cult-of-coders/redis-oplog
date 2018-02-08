import { Mongo } from 'meteor/mongo';

const Campaigns = new Mongo.Collection('campaign_searches');

if (Meteor.isServer) {
    Campaigns._ensureIndex({
        text: 'text'
    });
}

export { Campaigns };
