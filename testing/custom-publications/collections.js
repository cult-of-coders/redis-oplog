import { Mongo } from 'meteor/mongo';

const Items = new Mongo.Collection('custom_publication_items');

export {Items}
