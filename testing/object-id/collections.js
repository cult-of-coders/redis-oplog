import { Mongo } from 'meteor/mongo';

const SmartIds = new Mongo.Collection('smart_ids', {
    idGeneration: 'MONGO'
});

export { SmartIds };
