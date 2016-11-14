import { _ } from 'meteor/underscore';
import Channel, { ChannelType } from './Channel';

const getCollectionChannel = () => new Channel(ChannelType.COLLECTION);

export default ({namespace, channel, namespaces, channels}) => {
    let channelObjects = [];

    if (namespaces) {
        namespace.forEach(name => {
            channelObjects.push(
                new Channel(ChannelType.NAMESPACE, name)
            )
        })
    }

    if (namespace) {
        channelObjects.push(
            new Channel(ChannelType.NAMESPACE, namespace)
        )
    }

    if (channels) {
        channels.forEach(name => {
            channelObjects.push(
                new Channel(ChannelType.CHANNEL, name)
            )
        })
    }

    if (channel) {
        channelObjects.push(
            new Channel(ChannelType.NAMESPACE, channel)
        )
    }

    if (channelObjects.length === 0) {
        channelObjects.push(getCollectionChannel());
    }

    return channelObjects;
}