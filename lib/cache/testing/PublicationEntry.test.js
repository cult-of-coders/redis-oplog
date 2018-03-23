import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import PublicationEntry from '../PublicationEntry';
import { Events } from '../../constants';
import RedisSubscriptionManager from '../../redis/RedisSubscriptionManager';
import { MongoIDMap } from '../mongoIdMap';

describe('Unit-Test PublicationEntry', function () {
    RedisSubscriptionManager.init(); // fix travis failing test

    const Collection = new Mongo.Collection('test_publication_entry');
    it('should be able to addObserver + removeObserver + send', function () {
        const cursor = Collection.find();

        let inEntryRemove = false;
        const pe = new PublicationEntry('XXX', cursor, {
            remove() {
                inEntryRemove = true;
            }
        });

        assert.isObject(pe.observableCollection);
        assert.isObject(pe.redisSubscriber);
        assert.isTrue(pe.isObserversEmpty());

        const oc = pe.observableCollection;
        let store = new MongoIDMap();
        store.set('XXX', {number: 10});
        _.extend(oc, {
            __isInitialized: true,
            store,
        });

        let inAddedFunction = false;
        let inRemovedFunction = false;
        var observer = {
            added(collectionName, id, doc) {
                // should get here while performing initial add when running: addObserver
                assert.equal(collectionName, 'test_publication_entry');
                assert.equal(id, 'XXX');
                assert.equal(doc.number, 10);
                inAddedFunction = true;
            },
            removed(collectionName, id) {
                assert.equal(collectionName, 'test_publication_entry');
                assert.equal(id, 'XXX');
                inRemovedFunction = true;
            }
        };

        pe.addObserver(observer);
        assert.lengthOf(pe.observers, 1);
        assert.isFalse(pe.isObserversEmpty());

        pe.send('removed', 'test_publication_entry', 'XXX');

        pe.removeObserver(observer);
        assert.lengthOf(pe.observers, 0);

        assert.isTrue(inAddedFunction);
        assert.isTrue(inRemovedFunction);
        assert.isTrue(inEntryRemove);
    });

    it('should be able to call stop to all redisSubscribers', function (done) {
        const cursor = Collection.find();
        const pe = new PublicationEntry('XXX', cursor, []);

        pe.redisSubscriber = {
            stop() {
                done();
            }
        };

        pe.stop();
    })
});
