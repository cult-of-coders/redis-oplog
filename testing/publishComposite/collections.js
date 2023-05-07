import { Mongo } from 'meteor/mongo';

const Items = new Mongo.Collection('publish_composition');
const Children = new Mongo.Collection('publish_composition_children');

export {
    Items,
    Children
}
