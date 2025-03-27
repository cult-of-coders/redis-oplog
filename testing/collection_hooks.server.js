import {assert} from 'chai';
import {_} from 'meteor/underscore';

// TODO: collection-hooks is not migrated yet, there's a PR going on: https://github.com/Meteor-Community-Packages/meteor-collection-hooks/pull/309
describe.skip('It should work with collection:hooks', function () {
    const opts = [
        {},
        { channel: 'xxx' },
        { namespace: 'xxx' }
    ];

    let idx = 1;

    opts.forEach(options => {
        const Collection = new Mongo.Collection('test_redis_collection_hooks_' + idx++);

        it('Should detect all types of changes: ' + JSON.stringify(options), async function (done) {
            await Collection.removeAsync({});

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

            const id = await Collection.insertAsync({ someData: true });
            await Collection.updateAsync(id, { someData: false });
            await Collection.removeAsync(id);

            _.each(updates, (value, key) => {
                assert.isTrue(value, key);
            })

            done();
        })
    })
});
