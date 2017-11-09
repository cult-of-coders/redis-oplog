import RedisSubscriptionManager from '../../redis/RedisSubscriptionManager';
import { Events, RedisPipe } from '../../constants';
/**
 * Latency compensator acts exactly as a synthetic event, which is very quick
 *
 * @param channels
 * @param collectionName
 * @param event
 * @param doc
 * @param fields
 */
export default (channels, collectionName, event, doc, fields) => {
    channels.forEach(channel => {
        RedisSubscriptionManager.process(channel, {
            [RedisPipe.DOC]: doc,
            [RedisPipe.EVENT]: event,
            [RedisPipe.FIELDS]: fields
        });

        // direct processing does not make sense for direct inserts
        if (event !== Events.INSERT) {
            const dedicatedChannel = collectionName + '::' + doc._id;
            RedisSubscriptionManager.process(dedicatedChannel, {
                [RedisPipe.DOC]: doc,
                [RedisPipe.EVENT]: event,
                [RedisPipe.FIELDS]: fields,
            });
        }
    })
}