import PublicationEntry from '../PublicationEntry';
import { Events } from '../../constants';
import { Mongo } from 'meteor/mongo';
import RedisSubscriptionManager from '../../redis/RedisSubscriptionManager';
import { _ } from 'meteor/underscore';

describe('Unit-Test PublicationEntry', function () {
    RedisSubscriptionManager.init(); // fix travis failing test

    const Collection = new Mongo.Collection('test_publication_entry');
    it('should be able to addObserver + removeObserver + send', function () {
        const cursors = [
            Collection.find()
        ];

        const pe = new PublicationEntry('XXX', cursors, []);

        assert.lengthOf(pe.observableCollections, 1);
        assert.lengthOf(pe.redisSubscribers, 1);
        assert.isTrue(pe.isObserversEmpty());

        const oc = pe.observableCollections[0];
        _.extend(oc, {
            __isInitialized: true,
            store: {
                'XXX': {
                    number: 10
                }
            }
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
    });

    it('should be able to call stop to all redisSubscribers', function (done) {
        const cursors = [
            Collection.find()
        ];

        const pe = new PublicationEntry('XXX', cursors, []);

        pe.redisSubscribers = [{
            stop() {
                done();
            }
        }];

        pe.stop();
    })
});