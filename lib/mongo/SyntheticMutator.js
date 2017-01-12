import {Mongo} from 'meteor/mongo';
import {Random} from 'meteor/random';
import getRedisClient from '../redis/getRedisClient';
import {EJSON} from 'meteor/ejson';
import getFields from '../utils/getFields';
import {Events, RedisPipe} from '../constants';
import containsOperators from '../mongo/lib/containsOperators';

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
     * @param options
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
        if (!containsOperators(modifier)) {
            throw new Meteor.Error('Synthetic update can only be done through MongoDB operators.');
        }

        const { topLevelFields } = getFields(modifier);

        let message = {
            [RedisPipe.EVENT]: Events.UPDATE,
            [RedisPipe.SYNTHETIC]: true,
            [RedisPipe.DOC]: { _id },
            [RedisPipe.MODIFIER]: modifier,
            [RedisPipe.MODIFIED_TOP_LEVEL_FIELDS]: topLevelFields
        };

        SyntheticMutator.publish(channel, message);
    }

    /**
     * @param channel
     * @param _id
     * @param options
     */
    static remove(channel, _id) {
        SyntheticMutator.publish(channel, {
            [RedisPipe.EVENT]: Events.REMOVE,
            [RedisPipe.SYNTHETIC]: true,
            [RedisPipe.DOC]: {_id}
        });
    }
}