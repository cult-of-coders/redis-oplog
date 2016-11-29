import PublicationFactory from '../PublicationFactory';
import { Events } from '../../constants';
import { Mongo } from 'meteor/mongo';

describe('Unit-Test PublicationFactory', function () {
    const Collection = new Mongo.Collection('test_publication_factory');

    it('should create unique publication entries based on cursors dna', function () {
        const pf = PublicationFactory;

        assert.isObject(pf.store);
        assert.isObject(pf.queue);

        const cursor = Collection.find();

        const publicationEntry = pf.create(cursor, []);
        assert.isString(publicationEntry.id);

        assert.equal(publicationEntry, pf.create(cursor, []));

        const newCursor = Collection.find({someFilter: true});

        const newPublicationEntry = pf.create(newCursor, {});
        assert.isString(newPublicationEntry.id);
        assert.notEqual(publicationEntry, newPublicationEntry);

        assert.equal(newPublicationEntry, pf.create(newCursor, {}));

        assert.notEqual(publicationEntry.id, newPublicationEntry.id);
    });
});