import { MongoID } from 'meteor/mongo-id';
import { _ } from 'meteor/underscore';
import process from '../limit-sort';
import {Events} from '../../constants';
import ObservableCollection from '../../cache/ObservableCollection';

const Collection = new Mongo.Collection('limit_sort_test');

describe('Processor - Limit Sort', function () {
    let ids = [];

    it('Should bootstrap defaults', function () {
        Collection.remove({});

        ids = [];
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(idx => {
            ids.push(
                Collection.insert({
                    name: 'Name - ' + idx,
                    number: idx
                })
            );
        });
    });

    it('Inserting a new element that should be in OC', function () {
        const oc = new ObservableCollection({
            send: () => {
            }
        }, Collection.find({
            number: {$in: [1, 3, 5, 7, 9, 11, 13]}
        }, {
            limit: 3,
            sort: {
                number: -1
            }
        }));

        oc.init();

        let docId = Collection.insert({
            name: 'Name - 11',
            number: 11,
        });

        process(oc, Events.INSERT, Collection.findOne(docId));

        assert.equal(oc.store.size(), 3);
        assert.isObject(oc.store.get(docId));

        Collection.remove({_id: docId});

        process(oc, Events.REMOVE, {_id: docId});
        assert.equal(oc.store.size(), 3);
        assert.isUndefined(oc.store.get(docId));
    });

    it('Adding a new element that should not be in OC', function () {
        const oc = new ObservableCollection({
            send: () => {
            }
        }, Collection.find({
            number: {$in: [1, 3, 5, 7, 9, 11, 13]}
        }, {
            limit: 3,
            sort: {
                number: -1
            }
        }));

        oc.init();

        let docId = Collection.insert({
            name: 'Name - 12',
            number: 12,
        });

        process(oc, Events.INSERT, Collection.findOne(docId));

        assert.equal(oc.store.size(), 3);
        assert.isUndefined(oc.store.get(docId));

        Collection.remove({_id: docId});
    });

    it('Updating an element that is in OC, but should not remain in OC after update', function () {
        const cursor  = Collection.find({
            number: {$in: [1, 3, 5, 7, 9, 11, 13]}
        }, {
            limit: 3,
            sort: {
                number: -1
            }
        });

        const oc = new ObservableCollection({
            send: () => {
            }
        }, cursor);

        oc.init();

        let docs = cursor.fetch();
        let firstDocNumber = docs[0].number;
        let docId = docs[0]._id; // 9th element with 9 as number
        Collection.update(docId, {$set: {number: -1}});

        process(oc, Events.UPDATE, Collection.findOne(docId), ['number']);

        assert.equal(oc.store.size(), 3);
        assert.isUndefined(oc.store.get(docId));

        Collection.update(docId, {$set: {number: firstDocNumber}});
        process(oc, Events.UPDATE, Collection.findOne(docId), ['number']);

        assert.equal(oc.store.size(), 3);

        assert.isObject(oc.store.get(docId));
    });

    it('Updating an element that is in OC, and it should remain in it after update', function () {
        const oc = new ObservableCollection({
            send: () => {
            }
        }, Collection.find({
            number: {$in: [1, 3, 3.5, 5, 7, 9, 11, 13]}
        }, {
            limit: 3,
            sort: {
                number: -1
            }
        }));

        oc.init();

        let docId = ids[8]; // 9th element with 9 as number
        Collection.update(docId, {$set: {number: 9}});

        process(oc, Events.UPDATE, {_id: docId, number: 3.5}, ['number']);

        assert.equal(oc.store.size(), 3);
        assert.isObject(oc.store.get(docId));

        Collection.update(docId, {$set: {number: 9}});
        process(oc, Events.UPDATE, {_id: docId, number: 9}, ['number']);

        assert.equal(oc.store.size(), 3);
        assert.isObject(oc.store.get(docId));
    });

    it('Deleting an element that is in OC', function () {
        const oc = new ObservableCollection({
            send: () => {
            }
        }, Collection.find({
            number: {$in: [1, 3, 3.5, 5, 7, 9, 11, 13]}
        }, {
            limit: 3,
            sort: {
                number: -1
            }
        }));

        oc.init();

        let docId = Collection.insert({name: 'Name - 11', number: 11});

        process(oc, Events.INSERT, Collection.findOne(docId));

        assert.equal(oc.store.size(), 3);
        assert.isObject(oc.store.get(docId));

        Collection.remove({_id: docId});
        process(oc, Events.REMOVE, {_id: docId});

        assert.equal(oc.store.size(), 3);
        assert.isUndefined(oc.store.get(docId));
    });

    it('Deleting an element that is not in OC, but store should change bc of skip', function () {
        const oc = new ObservableCollection({
            send: () => {
            }
        }, Collection.find({
            number: {$in: [1, 3, 3.5, 5, 7, 9, 11, 13]}
        }, {
            limit: 3,
            skip: 2,
            sort: {
                number: -1
            }
        }));

        oc.init();

        let docId = ids[8];

        assert.isUndefined(oc.store.get(docId));
        let existingIds = oc.store.keys().map(MongoID.idStringify);

        Collection.remove({_id: docId});
        process(oc, Events.REMOVE, {_id: docId});

        // grab the stringified keys for comparison
        let newIds = oc.store.keys().map(MongoID.idStringify);
        assert.lengthOf(_.difference(existingIds, newIds), 1);
    })
});
