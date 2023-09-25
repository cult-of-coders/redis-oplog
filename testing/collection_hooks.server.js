import { assert } from 'chai';
import { _ } from 'meteor/underscore';

describe('It should work with collection:hooks', async function () {

    const opts = [
        {},
        { channel: 'xxx' },
        { namespace: 'xxx' },
    ];

    let idx = 1;

    for (const options of opts) {
        const Collection = new Mongo.Collection('test_redis_collection_hooks_' + idx++);
        await Collection.removeAsync({});

        it('Should detect all types of changes: ' + JSON.stringify(options), async function () {
            let updates = {
                'before.insert': false,
                'after.insert': false,
                'before.update': false,
                'after.update': false,
                'before.remove': false,
                'after.remove': false,
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

            const id = await Collection.insertAsync({ someData: true });
            await Collection.updateAsync(id, { someData: false });
            await Collection.removeAsync(id);

            _.each(updates, (value, key) => {
                assert.isTrue(value, key);
            })
        })
    }
});
