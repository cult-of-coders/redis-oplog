import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

let Items;

if (Meteor.isServer) {
    Items = new Mongo.Collection('transformers_items', {
        transform(doc) {
            doc.defaultServerTransform = true;
            return doc;
        }
    });
} else {
    Items = new Mongo.Collection('transformers_items', {
        transform(doc) {
            doc.defaultClientTransform = true;
            return doc;
        }
    });
}

export { Items }
