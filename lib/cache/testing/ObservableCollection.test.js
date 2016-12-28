import ObservableCollection from '../ObservableCollection';
import { Events } from '../../constants';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

describe('Unit-Test ObservableCollection', function () {
    const Collection = new Mongo.Collection('test_observable_collection');

    let emptyObserver = { send(){} };

    it('should construct', function () {
        const observer = {
            send(event, collectionName, id, data) {

            }
        };

        var cursor = Collection.find();

        var oc = new ObservableCollection(observer, cursor);

        assert.isNull(oc.testDocEligibility);
        assert.isFalse(oc.__isInitialized);
        assert.equal(oc.collectionName, 'test_observable_collection');
        assert.isTrue(_.keys(oc.selector).length == 0);
        assert.isTrue(_.keys(oc.options).length == 0);
        assert.isTrue(oc.isEligible({doc: 1}));

        cursor = Collection.find({isFiltered: true});
        oc = new ObservableCollection(observer, cursor);

        assert.isNotNull(oc.testDocEligibility);
        assert.isTrue(oc.isEligible({isFiltered: true}));
        assert.isFalse(oc.isEligible({isFiltered: false}));
        assert.isFalse(oc.isEligible({}));
    });

    it('should dispatch events to the observer: add', function (done) {
        let doc = {
            _id: 'XXX',
            data: 1
        };

        const observer = {
            send(event, collectionName, id, data) {
                assert.equal(event, 'added');
                assert.equal(collectionName, 'test_observable_collection');
                assert.equal(id, 'XXX');
                assert.equal(data.data, 1);

                done();
            }
        };

        var cursor = Collection.find();
        var oc = new ObservableCollection(observer, cursor);

        oc.add(doc, true);
    });

    it('should dispatch events to the observer: remove', function (done) {
        let doc = {
            _id: 'XXX',
            data: 1
        };

        const observer = {
            send(event, collectionName, id) {
                assert.equal(event, 'removed');
                assert.equal(collectionName, 'test_observable_collection');
                assert.equal(id, 'XXX');

                done();
            }
        };

        var cursor = Collection.find();
        var oc = new ObservableCollection(emptyObserver, cursor);

        oc.add(doc, true);

        oc.observer = observer;
        oc.remove('NON EXISTING ID'); // should not fail
        oc.remove(doc._id);
    });
});