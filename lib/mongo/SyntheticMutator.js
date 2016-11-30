import {Mongo} from 'meteor/mongo';
import {Random} from 'meteor/random';
import getRedisClient from '../redis/getRedisClient';
import {EJSON} from 'meteor/ejson';
import {Events, RedisPipe} from '../constants';

/**
 * call(Mongo.Collection).insert(data)
 * @param channelOrCollection {Mongo.Collection|string}
 */
export default class SyntheticMutator {
    static getChannel(channelOrCollection) {
        if (channelOrCollection instanceof Mongo.Collection) {
            return channelOrCollection._name
        }

        return channelOrCollection;
    }

    /**
     * @param channel
     * @param data
     */
    static publish(channel, data) {
        getRedisClient().publish(channel, EJSON.stringify(data));
    }

    /**
     * @param channel
     * @param data
     */
    static insert(channel, data) {
        if (!data._id) {
            data._id = Random.id();
        }

        SyntheticMutator.publish(channel, {
            [RedisPipe.EVENT]: Events.INSERT,
            [RedisPipe.SYNTHETIC]: true,
            [RedisPipe.DOC]: data
        })
    }

    /**
     * @param channel
     * @param _id
     * @param modifier
     */
    static update(channel, _id, modifier) {
        let message = {
            [RedisPipe.EVENT]: Events.UPDATE,
            [RedisPipe.SYNTHETIC]: true,
            [RedisPipe.DOC]: _.extend(modifier, { _id })
        };

        SyntheticMutator.publish(channel, message);
    }

    /**
     * @param channel
     * @param _id
     */
    static remove(channel, _id) {
        SyntheticMutator.publish(channel, {
            [RedisPipe.EVENT]: Events.REMOVE,
            [RedisPipe.SYNTHETIC]: true,
            [RedisPipe.DOC]: {_id}
        });
    }
}