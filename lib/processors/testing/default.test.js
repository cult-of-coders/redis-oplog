import process from '../default';
import { Events } from '../../constants';
import { MongoIDMap } from '../../cache/mongoIdMap';

describe('Processor - Default', function () {
    it('Should work as expected on Events.INSERT', function (done) {
        let store = new MongoIDMap();
        let observableCollection = {
            store,
            isEligible(doc) {
                return doc._id === 'YYY';
            },
            isEligibleByDB(docId) {
                return docId === 'YYY';
            },
            add(doc) {
                assert.equal(doc._id, 'YYY');
                done();
            },
            contains: () => false
        };

        process(observableCollection, Events.INSERT, {
            _id: 'XXX',
        });
        process(observableCollection, Events.INSERT, {
            _id: 'YYY',
        });
    });


    it('Should work as expected on Events.UPDATE', function () {
        let inChangeEvent = false;
        let inAddByIdEvent = false;
        let store = new MongoIDMap();
        store.set('XXX', {_id: 'XXX', number: 10});

        let observableCollection = {
            store,
            options: {},
            isEligibleByDB(docId) {
                return docId === 'YYY' || docId === 'XXX';
            },
            isEligible(doc) {
                return doc._id === 'YYY' || doc._id === 'XXX';
            },
            change(docId, doc) {
                assert.equal(docId, 'YYY');
                assert.equal(doc.number, 10);
                done();
            },
            add() {
                throw 'Should not be here.'
            },
            addById(docId) {
                inAddByIdEvent = true;
            },
            change(docId, doc) {
                inChangeEvent = true;
            },
            contains() {
                return true;
            }
        };

        process(observableCollection, Events.UPDATE, {
            _id: 'XXX',
            number: 5
        });

        assert.isTrue(inChangeEvent);

        let inAddEvent = false;
        observableCollection.add = () => {
            inAddEvent = true;
        };
        observableCollection.contains = () => false;

        process(observableCollection, Events.UPDATE, {
            _id: 'YYY',
            number: 10
        });

        assert.isTrue(inAddEvent);
    });

    it('Should work as expected on Events.REMOVE', function () {
        let inRemoveEvent = false;
        let store = new MongoIDMap();
        store.set('XXX', {_id: 'XXX', number: 10});

        let observableCollection = {
            store,
            isEligibleByDB(docId) {
                return docId === 'YYY' || docId === 'XXX';
            },
            change(docId, doc) {
                assert.equal(docId, 'YYY');
                assert.equal(doc.number, 10);
                done();
            },
            add() {
                throw 'Should not be here.'
            },
            change(docId, doc) {
                throw 'Should not get here.'
            },
            remove(docId) {
                inRemoveEvent = true;
            },
            contains() {
                return true;
            }
        };

        process(observableCollection, Events.REMOVE, {
            _id: 'XXX'
        });

        assert.isTrue(inRemoveEvent);

        inRemoveEvent = false;
        observableCollection.contains = () => false;

        process(observableCollection, Events.REMOVE, {
            _id: 'XXX',
        });

        assert.isFalse(inRemoveEvent);
    })
});
