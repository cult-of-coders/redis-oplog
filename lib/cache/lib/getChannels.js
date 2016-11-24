import { _ } from 'meteor/underscore';

export default (collectionName, {namespace, channel, namespaces, channels}) => {
    let channelStrings = [];

    if (namespaces) {
        namespace.forEach(name => {
            channelStrings.push(`${name}::${collectionName}`)
        })
    }

    if (namespace) {
        channelStrings.push(
            channelStrings.push(`${namespace}::${collectionName}`)
        )
    }

    if (channels) {
        channels.forEach(name => {
            channelStrings.push(
                channelStrings.push(name)
            )
        })
    }

    if (channel) {
        channelStrings.push(
            channelStrings.push(channel)
        )
    }

    if (channelStrings.length === 0) {
        channelStrings.push(collectionName);
    }

    return channelStrings;
}