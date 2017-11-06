import requery from '../actions/requery';
import {Mongo} from 'meteor/mongo';
import {Events} from '../../constants';
import ObservableCollection from '../../cache/ObservableCollection';
import {_} from 'meteor/underscore';

describe('Processors - Requery Action', function () {
    const Collection = new Mongo.Collection('requery_test_action');
    Collection.remove({});

    let ids = [];
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(idx => {
        ids.push(
            Collection.insert({
                name: 'Name - ' + idx,
                number: idx
            })
        );
    });

    it('should work without filters', function () {
        const oc = new ObservableCollection({
            send: () => {
            }
        }, Collection.find());

        oc.init();

        let newId = Collection.insert({name: 'Name - 11'});
        requery(oc);
        assert.lengthOf(_.keys(oc.store), 11);

        Collection.remove({_id: newId});
        requery(oc);
        assert.lengthOf(_.keys(oc.store), 10);
    });

    it('should work with filters', function () {
        const oc = new ObservableCollection({
            send: () => {
            }
        }, Collection.find({
            number: {$in: [1, 3, 5, 7, 9, 11, 13]}
        }));

        oc.init();

        let newId = Collection.insert({name: 'Name - 11', number: 11});
        requery(oc);
        assert.lengthOf(_.keys(oc.store), 6);

        Collection.remove({_id: newId});
        requery(oc);
        assert.lengthOf(_.keys(oc.store), 5);

        newId = Collection.insert({name: 'Name - 12', number: 12});
        requery(oc);
        assert.lengthOf(_.keys(oc.store), 5);

        Collection.remove({_id: newId});
    });

    it('should properly work with limit sort', function () {
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

        assert.lengthOf(_.keys(oc.store), 3);
        requery(oc);

        let newId = Collection.insert({name: 'Name - 13', number: 13});
        requery(oc);
        assert.lengthOf(_.keys(oc.store), 3);
        assert.isObject(oc.store[newId]);

        Collection.remove({_id: newId});
        requery(oc);
        assert.lengthOf(_.keys(oc.store), 3);
        assert.isUndefined(oc.store[newId]);
    })
});