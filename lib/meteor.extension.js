import { Meteor } from 'meteor/meteor';
import Publication from './publication';
import { _ } from 'meteor/underscore';
import Config from './config';
import getRedisClient from './utils/getRedisClient';

_.extend(Meteor, {
    publishWithRedis(name, fn, {namespace} = {}) {
        if (!Config.isInitialized) {
            throw new Meteor.Error(`RedisOplog is not initialized`)
        }

        Meteor.publish(name, function (...args) {
            const cursor = fn.call(this, ...args);
            const client = getRedisClient(true);
            let publications = [];

            if (_.isArray(cursor)) {
                cursor.forEach(c => {
                    publications.push(
                        new Publication(client, this, c, namespace)
                    );
                })
            } else {
                publications.push(
                    new Publication(client, this, cursor, namespace)
                );
            }

            this.onStop(() => {
                client.disconnect();
                publications.forEach(publication => {
                    publication.stop();
                })
            })
        })
    }
});
