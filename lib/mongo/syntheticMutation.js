import {Mongo} from 'meteor/mongo';
import getRedisClient from '../redis/getRedisClient';
import { EJSON } from 'meteor/ejson';
import { Events, RedisPipe } from '../constants';

/**
 * call(Mongo.Collection).insert(data)
 * @param channelOrCollection {Mongo.Collection|string}
 */
export default function (channelOrCollection) {
    const channel = (channelOrCollection instanceof Mongo.Collection) ? channelOrCollection._name : channelOrCollection;
    const client = getRedisClient();

    return new class {
        insert(data) {
            client.publish(channel, EJSON.stringify({
                [RedisPipe.EVENT]: Events.INSERT,
                [RedisPipe.SYNTHETIC]: true,
                [RedisPipe.DOC]: data
            }));
        }

        update(_id, data) {
            client.publish(channel, EJSON.stringify({
                [RedisPipe.EVENT]: Events.UPDATE,
                [RedisPipe.SYNTHETIC]: true,
                [RedisPipe.DOC]: _.extend({}, data, {_id})
            }));
        }

        remove(_id) {
            client.publish(channel, EJSON.stringify({
                [RedisPipe.EVENT]: Events.UPDATE,
                [RedisPipe.SYNTHETIC]: true,
                [RedisPipe.DOC]: {_id}
            }));
        }
    }
}