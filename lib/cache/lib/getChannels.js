import getChannelName from "../../utils/getChannelName";

export default (
  collectionName,
  { namespace, channel, namespaces, channels } = {}
) => {
  let channelStrings = [];

  if (namespaces) {
    namespaces.forEach((name) => {
      channelStrings.push(`${name}::${collectionName}`);
    });
  }

  if (namespace) {
    channelStrings.push(`${namespace}::${collectionName}`);
  }

  if (channels) {
    channels.forEach((name) => {
      channelStrings.push(name);
    });
  }

  if (channel) {
    channelStrings.push(channel);
  }

  if (channelStrings.length === 0) {
    channelStrings.push(collectionName);
  }

  return channelStrings.map(getChannelName);
};
