import { MongoID } from 'meteor/mongo-id';
import getChannelName from './getChannelName';

// TODO do we want to support the multiple `namespaces` config for dedicated channels?
export default function getDedicatedChannel(collectionName, docId, { namespace }){
  const channelName = `${namespace ? (namespace + '::') : ''}${collectionName}::${MongoID.idStringify(docId)}`;
  return getChannelName(channelName);
}
