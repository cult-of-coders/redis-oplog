import { Mongo } from 'meteor/mongo';

const Items = new Mongo.Collection('optimistic_ui_items');

export {
    Items
}
