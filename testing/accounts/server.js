import { Accounts } from 'meteor/accounts-base';

// UserPresence.onCleanup(function(){
//     Meteor.users.update({}, {$unset:{status:true}}, {multi:true});
// });
UserPresence.onUserOnline(function(userId) {
    Meteor.users.update({ _id: userId }, { $set: { status: 'online' } });
});
// UserPresence.onUserIdle(function(userId){
//     Meteor.users.update({_id:userId}, {$set:{status:"idle"}})
// });
// UserPresence.onUserOffline(function(userId){
//     Meteor.users.update({_id:userId}, {$unset:{status:true}})
// });

Meteor.publish('accounts_userData', function(options) {
    const uid = this.userId;

    if (!uid) {
        return this.ready();
    }

    return Meteor.users.find(
        {
            _id: uid,
        },
        options
    );
});

Meteor.publish('accounts_usersAssoc', function() {
    let _groups = Roles.getGroupsForUser(this.userId, 'subscribed');

    return Meteor.users.find(
        {
            _id: {
                $in: [this.userId], //an array of ids from roles getGroupsForUser
            },
        },
        {
            fields: {
                profile: 1,
                subscription: 1,
                username: 1,
            },
            sort: {
                createdAt: 1,
            },
        }
    );
});

Meteor.methods({
    accounts_createUser(data) {
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
            email,
        };
    },
    accounts_updateUser(filters, modifier) {
        Meteor.users.update(filters, modifier, {
            optimistic: false,
        });
    },
});
