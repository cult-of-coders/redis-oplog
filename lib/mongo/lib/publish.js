import { EJSON } from 'meteor/ejson';

/**
 * @param client
 * @param collectionName {string}
 * @param channels {Array<Channel>}
 * @param data {Object}
 * @param namespacedId This is the id of the document, for direct processing.
 */
export default (client, collectionName, channels, data, namespacedId) => {
    const message = EJSON.stringify(data);

    if (channels.length) {
        channels.forEach(channelName => {
            if (channelName) {
                // sometimes it can be null, need to think about it
                client.publish(channelName, message);
            }

            if (namespacedId) {
                client.publish(collectionName + '::' + namespacedId, message);
            }
        })
    }
};
