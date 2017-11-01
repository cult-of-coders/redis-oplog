import {Mongo} from 'meteor/mongo';

const Items = new Mongo.Collection('autorun_test_items');
const Orders = new Mongo.Collection('autorun_test_orders');

export {Orders, Items}
