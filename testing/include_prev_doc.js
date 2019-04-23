import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import Config from '../lib/config';
import { Collections } from './boot';

const PrevDocCollection = new Mongo.Collection('test_redis_prev_doc');
const NoPrevDocCollection = new Mongo.Collection('test_redis_no_prev_doc');

PrevDocCollection.configureRedisOplog({
  shouldIncludePrevDocument: true,
});

describe('PrevDocCollection Serverside', function () {
  it('Should receive an insert event with prev doc', async function (done) {
    Config.pubSubManager.subscribe('test_redis_prev_doc', function(payload) {
      if (payload.e === 'u') {
        assert.equal(payload.d.value, 'oldValue');
      }
      if (payload.e === 'r') {
        assert.equal(payload.d.value, 'newValue');
        done();
      }
    });

    PrevDocCollection.insert({ _id: 'prev_doc_1', value: 'oldValue' });
    PrevDocCollection.update({ _id: 'prev_doc_1' }, { $set: { value: 'newValue' } });
    PrevDocCollection.remove({ _id: 'prev_doc_1' });
    assert.equal(true, true);
  });

  it('Should receive an insert event without prev doc', async function (done) {
    Config.pubSubManager.subscribe('test_redis_no_prev_doc', function(payload) {
      if (payload.e === 'r') {
        assert.equal(payload.d.value, undefined);
        done();
      }
    });

    NoPrevDocCollection.insert({ _id: 'no_prev_doc_1', value: 'oldValue' });
    NoPrevDocCollection.update({ _id: 'no_prev_doc_1' }, { $set: { value: 'newValue' } });
    NoPrevDocCollection.remove({ _id: 'no_prev_doc_1' });
  });
});

