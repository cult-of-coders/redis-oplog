import { diff } from 'deep-diff';
import cloneDeep from 'lodash.clonedeep';
import { DDP } from 'meteor/ddp';
import isRemovedNonExistent from '../utils/isRemovedNonExistent';
import { Mongo, MongoInternals } from 'meteor/mongo';
import { LocalCollection } from 'meteor/minimongo';
import { Random } from 'meteor/random';
import observeChanges from './observeChanges';

const MongoCursor = Object.getPrototypeOf(
    MongoInternals.defaultRemoteCollectionDriver().mongo.find()
).constructor;

export default function() {
    MongoInternals.Connection.prototype._observeChanges = observeChanges;
}
