import { assert } from 'chai';

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
        Config.pubSubManager.subscribe('test_redis_prev_doc', function (payload) {
            // make sure events have prev document values
            if (payload.e === 'u') {
                assert.equal(payload.d.value, 'oldValue');
            }
            if (payload.e === 'r') {
                assert.equal(payload.d.value, 'newValue');
                done();
            }
        });

        const random = Random.id()

        // trigger insert update and removed redis events
        await PrevDocCollection.insertAsync({ _id: `${random}`, value: 'oldValue' });
        await PrevDocCollection.updateAsync({ _id: `${random}` }, { $set: { value: 'newValue' } });
        await PrevDocCollection.removeAsync({ _id: `${random}` });
    });

    it('Should receive an insert event without prev doc', async function (done) {
        Config.pubSubManager.subscribe('test_redis_no_prev_doc', function (payload) {
            // make sure events do not have any prev document values
            // because NoPrevDocCollection does not have shouldIncludePrevDocument set
            // to true
            if (payload.e === 'u') {
                assert.equal(payload.d.value, undefined);
            }
            if (payload.e === 'r') {
                assert.equal(payload.d.value, undefined);
                done();
            }
        });

        // trigger insert update and removed redis events
        await NoPrevDocCollection.insertAsync({ _id: 'no_prev_doc_1', value: 'oldValue' });
        await NoPrevDocCollection.updateAsync({ _id: 'no_prev_doc_1' }, { $set: { value: 'newValue' } });
        await NoPrevDocCollection.removeAsync({ _id: 'no_prev_doc_1' });
    });
});

