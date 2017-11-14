import extendMongoCollection from './lib/mongo/extendMongoCollection.client';
import VentClient from './lib/vent/VentClient';

extendMongoCollection();

const Vent = new VentClient();

export {
    Vent
};