import reload from '../actions/reload';
import ObservableCollection from '../../cache/ObservableCollection';
import {_} from 'meteor/underscore';

describe('Tests reloading an observable collection', function () {
    const Collection = new Mongo.Collection('reload_test_action');
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


    it('Should add the elements missing, remove what isnt there, and update existing', function () {
        const oc = new ObservableCollection({
            send: () => {}
        }, Collection.find());
        oc.init();

        // remove the last id
        const lastId = _.last(ids);
        Collection.remove(lastId);

        // add a new item
        const newId = Collection.insert({
            name: 'Name - 11',
            number: 11,
        });

        // update an existing item
        const updateId = _.first(ids);
        Collection.update(updateId, {
            $set: {
                number: 'new',
            }
        });

        reload(oc);

        assert.isUndefined(oc.store[lastId]);
        assert.isObject(oc.store[newId]);
        assert.isObject(oc.store[updateId]);
        assert.equal('new', oc.store[updateId].number);
    })
});