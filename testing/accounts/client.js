import { assert } from 'chai';
import {Meteor} from 'meteor/meteor';
import { DDP } from 'meteor/ddp-client';

describe('Testing accounts functionality', function () {
    it('Should properly subscribe and login', function (done) {
        const roles = {
            "__global_roles__": [
                "coach"
            ],
            "PLAN": [
                "team"
            ],
            "c76nFngLhej8PcCdT" : [
                "subscribed",
                "coach-associated"
            ],
        };

        Meteor.subscribe('accounts_usersAssoc');
        const handle = Meteor.subscribe('accounts_userData', {
            limit: 1,
            sort: {
                createdAt: 1,
            },
            fields: {
                _id: 1,
                emails: 1,
                roles: 1,
                lastLogin: 1,
                something: 1,
            }
        });

        Meteor.call('accounts_createUser', {
            roles,
            something: true,
        }, function (err, {
            userId,
            email
        }) {
            Meteor.loginWithPassword(email, '12345', function (err) {
                const user = Meteor.user();
                assert.isObject(user.roles);

                const observer = Meteor.users.find({_id: userId}).observeChanges({
                    changed(userId, fields) {
                        assert.isDefined(fields.lastLogin);

                        observer.stop();
                        handle.stop();

                        Meteor.logout(function () {
                            done();
                        });
                    }
                });

                Meteor.call('accounts_updateUser', Meteor.userId(), {
                    $set: {
                        lastLogin: new Date(),
                    }
                });
            });
        })
    });
});

