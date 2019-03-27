import {Mongo} from 'meteor/mongo';
import 'meteor/aldeed:collection2';
import {Collections} from './boot';

const RedisCollection = Collections.Standard;

describe('Callbacks', function () {
    it('Should fire the insert callback', function (done) {
        RedisCollection.insert({game: 'darts', title: 'testgame'}, (err, result) => done(err))
    })
    it('Should fire the update callback', function (done) {
        const _id = RedisCollection.insert({game: 'darts-2'});
        RedisCollection.update({_id}, {$set: {title: 'newtitle'}}, {}, (err, result) => done(err))
    })
    it('Should fire the remove callback', function (done) {
        const {_id} = RedisCollection.findOne({game: 'darts'}) || {}
        RedisCollection.remove({_id}, (err, result) => done(err))
    })
})

const Collection2 = new Mongo.Collection('collection2')
Collection2.attachSchema(new SimpleSchema({
    title: {type: String},
    score: {type: Number, optional: true}
}));

describe('Collection2 support', function () {
    it('Should trim spaces in string', function (done) {
        Collection2.insert({title: 'testtitle   '}, (err, result) => {
            if (err) return done(err)
            const doc = Collection2.findOne(result)
            if (doc.title !== 'testtitle') return done('string not trimmed')
            done()
        })
    })

    it('Should not insert a doc after filtering out keys', function (done) {
        let _id;
        try {
            _id = Collection2.insert({foo: 'bar'})
        } catch (err) {
        } finally {
            if (_id) return done('document should not be added')
            done()
        }
    })

    it('Should remove all documents', function (done) {
        Collection2.remove({})
        done()
    })
})
