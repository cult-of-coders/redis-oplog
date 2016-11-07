import PublicationFactory from '../PublicationFactory';
import { Events } from '../../constants';
import { Mongo } from 'meteor/mongo';

describe('Unit-Test PublicationFactory', function () {
    const Collection = new Mongo.Collection('test_publication_factory');

    it('should create unique publication entries based on cursors dna', function () {
        const pf = new PublicationFactory('test');

        assert.isObject(pf.store);
        assert.isObject(pf.queue);

        const cursors = [
            Collection.find()
        ];

        const publicationEntry = pf.create(cursors, []);
        assert.isString(publicationEntry.id);

        assert.equal(publicationEntry, pf.create(cursors, []));

        const newCursors = [
            Collection.find({someFilter: true})
        ];

        const newPublicationEntry = pf.create(newCursors, []);
        assert.isString(newPublicationEntry.id);
        assert.notEqual(publicationEntry, newPublicationEntry);

        assert.equal(newPublicationEntry, pf.create(newCursors, []));

        assert.notEqual(publicationEntry.id, newPublicationEntry.id);
    });

    it('should stop a publication entry with empty observers', function (done) {
        const pf = new PublicationFactory('test');

        pf.removeObserver({
            isObserversEmpty() {
                return true;
            },
            removeObserver() {

            },
            stop() {
                done();
            }
        }, {});
    })
});