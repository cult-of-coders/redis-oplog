import { Mongo } from 'meteor/mongo'

const Items = new Mongo.Collection('collection_defaults_items');

export {
    Items
}
