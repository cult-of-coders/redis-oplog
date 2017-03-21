import process from '../limit-sort';
import {Events} from '../../constants';
import ObservableCollection from '../../cache/ObservableCollection';
import { _ } from 'meteor/underscore';

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

        assert.lengthOf(_.keys(oc.store), 3);
        assert.isObject(oc.store[docId]);

        Collection.remove({_id: docId});

        process(oc, Events.REMOVE, {_id: docId});
        assert.lengthOf(_.keys(oc.store), 3);
        assert.isUndefined(oc.store[docId]);
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

        assert.lengthOf(_.keys(oc.store), 3);
        assert.isUndefined(oc.store[docId]);

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

        process(oc, Events.UPDATE, {_id: docId}, ['number']);

        assert.lengthOf(_.keys(oc.store), 3);
        assert.isUndefined(oc.store[docId]);

        Collection.update(docId, {$set: {number: firstDocNumber}});
        process(oc, Events.UPDATE, {_id: docId}, ['number']);

        assert.lengthOf(_.keys(oc.store), 3);

        assert.isObject(oc.store[docId]);
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

        assert.lengthOf(_.keys(oc.store), 3);
        assert.isObject(oc.store[docId]);

        Collection.update(docId, {$set: {number: 9}});
        process(oc, Events.UPDATE, {_id: docId, number: 9}, ['number']);

        assert.lengthOf(_.keys(oc.store), 3);
        assert.isObject(oc.store[docId]);
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

        assert.lengthOf(_.keys(oc.store), 3);
        assert.isObject(oc.store[docId]);

        Collection.remove({_id: docId});
        process(oc, Events.REMOVE, {_id: docId});

        assert.lengthOf(_.keys(oc.store), 3);
        assert.isUndefined(oc.store[docId]);
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

        assert.isUndefined(oc.store[docId]);
        let existingIds = _.keys(oc.store);

        Collection.remove({_id: docId});
        process(oc, Events.REMOVE, {_id: docId});

        let newIds = _.keys(oc.store);

        assert.lengthOf(_.difference(existingIds, newIds), 1);
    })
});