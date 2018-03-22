import { EJSON } from 'meteor/ejson';
import { getRedisPusher } from '../../redis/getRedisClient';
import getChannelName from '../../utils/getChannelName';

/**
 * @param collectionName {string}
 * @param channels {Array<Channel>}
 * @param data {Object}
 * @param namespacedId This is the id of the document, for direct processing.
 */
export default (collectionName, channels, data, namespacedId) => {
    const message = EJSON.stringify(data);
    const client = getRedisPusher();

    if (channels.length) {
        channels.forEach(channelName => {
            if (channelName) {
                // sometimes it can be null, need to think about it
                client.publish(channelName, message);
            }

            if (namespacedId) {
                client.publish(getChannelName(collectionName + '::' + namespacedId), message);
            }
        })
    }
};
