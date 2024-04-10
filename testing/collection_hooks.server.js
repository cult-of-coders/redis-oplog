import { assert } from 'chai';
import { _ } from 'meteor/underscore';

describe('It should work with collection:hooks', function () {

    const opts = [
        {},
        { channel: 'xxx' },
        { namespace: 'xxx' }
    ];

    let idx = 1;

    opts.forEach(options => {
        const Collection = new Mongo.Collection('test_redis_collection_hooks_' + idx++);
        Collection.remove({});

        it('Should detect all types of changes: ' + JSON.stringify(options), function () {
            let updates = {
                'before.insert': false,
                'after.insert': false,
                'before.update': false,
                'after.update': false,
                'before.remove': false,
                'after.remove': false
            };

            Collection.before.insert(function () {
                updates['before.insert'] = true;
            });
            Collection.after.insert(function () {
                updates['after.insert'] = true;
            });
            Collection.before.update(function () {
                updates['before.update'] = true;
            });
            Collection.after.update(function () {
                updates['after.update'] = true;
            });
            Collection.before.remove(function () {
                updates['before.remove'] = true;
            });
            Collection.after.remove(function () {
                updates['after.remove'] = true;
            });

            const id = Collection.insert({ someData: true });
            Collection.update(id, { someData: false });
            Collection.remove(id);

            _.each(updates, (value, key) => {
                assert.isTrue(value, key);
            })
        })

        it('Should use direct methods when available: ' + JSON.stringify(options), function () {
            let withDirect = true;

            Collection.before.find(function () {
                withDirect = false;
            });

            const handle = Collection.find({
                someData: true,
            }).observeChanges({
                added: function() {}
            });

            assert.isTrue(withDirect, 'Used direct');

            handle.stop();
        })
    })
});