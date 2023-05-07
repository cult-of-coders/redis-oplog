import { Mongo } from 'meteor/mongo';

export const Items = new Mongo.Collection('autorun_test_items');
export const Orders = new Mongo.Collection('autorun_test_orders');
