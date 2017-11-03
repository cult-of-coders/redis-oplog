import {Mongo} from 'meteor/mongo';

const Items = new Mongo.Collection('performant_counts_items');

export {Items}
