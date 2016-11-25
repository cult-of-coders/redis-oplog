import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2';
import { RedisCollection } from './boot';

describe('Callbacks', function () {
    it('Should fire the insert callback', function (done) {
        RedisCollection.insert({ game: 'darts', title: 'testgame' }, (err, result) => done(err))
    })
    it('Should fire the update callback', function (done) {
        const { _id } = RedisCollection.findOne({ game: 'darts' }) || {}
        RedisCollection.update({ _id }, { $set: { title: 'newtitle' } }, (err, result) => done(err))
    })
    it('Should fire the remove callback', function (done) {
        const { _id } = RedisCollection.findOne({ game: 'darts' }) || {}
        RedisCollection.remove({ _id }, (err, result) => done(err))
    })
})

const Collection2 = new Mongo.Collection('collection2')
Collection2.attachSchema({
  title: { type: String },
  score: { type: Number, optional: true }
})

describe('Collection2 support', function () {
    it('Should trim spaces in string', function (done) {
        Collection2.insert({ title: 'testtitle   ' }, (err, result) => {
          if (err) return done(err)
          const doc = Collection2.findOne(result)
          if (doc.title !== 'testtitle') return done('string not trimmed')
          done()
        })
    })

    it('Should not insert a doc after filtering out keys', function (done) {
        let _id;
        try {
          _id = Collection2.insert({ foo: 'bar' })
        } catch (err) {} finally {
          if (_id) return done('document should not be added')
          done()
        }
    })

    it('Should respect insert options', function (done) {
        Collection2.insert({ title: 'testtitle   ', foo: 'bar' }, { bypassCollection2: true }, (err, result) => {
          if (err) return done(err)
          const doc = Collection2.findOne(result)
          if (doc.title !== 'testtitle   ' || !doc.foo) return done('options not applied')
          done()
        })
    })

    it('Should not update document with non schema keys', function (done) {
        const { _id } = Collection2.findOne()
        let updated;
        try {
          updated = Collection2.update({ _id }, { $set: { score: 'bad' } })
        } catch (err) {} finally {
          if (updated) return done('document should not be updated')
          done()
        }
    })

    it('Should respect update options', function (done) {
        const { _id } = Collection2.findOne()
        Collection2.update({ _id }, { $set: { score: 'bad' } }, { bypassCollection2: true }, (err) => {
          if (err) return done(err)
          const doc = Collection2.findOne({ _id })
          if (doc.score !== 'bad') return done('options not applied')
          done()
        })
    })

    it('Should remove all documents', function (done) {
      Collection2.remove({})
      done()
    })
})
