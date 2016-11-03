import { EJSON } from 'meteor/ejson';

/**
 * @param client
 * @param collectionName {string}
 * @param channels {Array<Channel>}
 * @param data {Object}
 * @param namespacedId
 */
export default (client, collectionName, channels, data, namespacedId) => {
    const message = EJSON.stringify(data);

    if (channels.length) {
        channels.forEach(channelObject => {
            client.publish(channelObject.getString(collectionName), message);
        })
    } else {
        client.publish(collectionName, message);
        if (namespacedId) {
            client.publish(collectionName + '::' + namespacedId, message);
        }
    }
};
