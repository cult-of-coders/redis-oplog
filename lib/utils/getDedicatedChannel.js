import { MongoID } from "meteor/mongo-id";
import getChannelName from "./getChannelName";

export default function getDedicatedChannel(collectionName, docId) {
  const channelName = `${collectionName}::${MongoID.idStringify(docId)}`;
  return getChannelName(channelName);
}
