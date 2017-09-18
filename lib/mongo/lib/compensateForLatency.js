import RedisSubscriptionManager from '../../redis/RedisSubscriptionManager';
import { Events } from '../../constants';
import debug from '../../debug';

/**
 * Latency compensator acts exactly as a synthetic event, which is very quick
 *
 * @param channels
 * @param collectionName
 * @param event
 * @param uid
 * @param doc
 * @param fields
 */
export default (channels, collectionName, event, uid, doc, fields) => {
    channels.forEach(channel => {

        let subscribers = RedisSubscriptionManager.store[channel];
        debug(`compensateForLatency channel ${channel}`);
        if (subscribers && subscribers.length) {
            debug(`compensateForLatency subscribers ${subscribers.length}`);
            RedisSubscriptionManager.channelLastIds[channel] = uid;
            subscribers.forEach(subscriber => {
                subscriber.processSync(event, doc, fields);
                // if (subscriber.strategy !== Strategy.LIMIT_SORT) {
                //     we may have shared processors and limit_sort is not reliable
                    // syntheticProcessor(subscriber.observableCollection, event, doc)
                // }
            })
        }

        // direct processing does not make sense for direct inserts
        if (event !== Events.INSERT) {
            let directSubs = RedisSubscriptionManager.store[collectionName + '::' + doc._id];
            if (directSubs && directSubs.length) {
                RedisSubscriptionManager.channelLastIds[channel] = uid;

                directSubs.forEach(subscriber => {
                    subscriber.processSync(event, doc, fields);
                })
            }
        }
    })
}
