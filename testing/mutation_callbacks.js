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
