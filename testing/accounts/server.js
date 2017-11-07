import {Accounts} from 'meteor/accounts-base'

Meteor.publish('accounts_userData', function (options) {
    const uid = this.userId;
    if (!uid) {
        return this.ready();
    }

    return Meteor.users.find({
        _id: uid,
    }, options);
});

Meteor.methods({
    'accounts_createUser'(data) {
        const email = `${Random.id()}@x.com`;
        const userId = Accounts.createUser({
            username: Random.id(),
            email,
            password: '12345',
        });

        Meteor.users.update(userId, {
            $set: data,
        });

        return {
            userId,
            email
        };
    },
    'accounts_updateUser'(filters, modifier) {
        Meteor.users.update(filters, modifier, {
            optimistic: false,
        });
    },
});