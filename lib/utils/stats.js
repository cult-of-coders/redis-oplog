import RedisSubscriptionManager from '../redis/RedisSubscriptionManager';
import PublicationFactory from '../cache/PublicationFactory';
import {_} from 'meteor/underscore';
import sizeof from 'object-sizeof';

export default () => {
    // total of active queries
    const totalQueries = _.keys(PublicationFactory.store.store).length;
    const redisChannels = _.keys(RedisSubscriptionManager.store).length;

    let totalSize = 0;
    let totalObservers = 0;
    let maxSize = 0;
    let maxSizePubEntry = 0;
    let maxObservers = 0;
    let maxObserversPubEntry;

    _.each(PublicationFactory.store.store, (pubEntry, id) => {
        const size = sizeof(pubEntry.observableCollection.store);
        totalSize += size;

        if (size > maxSize) {
            maxSize = size;
            maxSizePubEntry = pubEntry;
        }

        const observersCount = pubEntry.observers.length;
        totalObservers += observersCount;

        if (observersCount > maxObservers) {
            maxObservers = observersCount;
            maxObserversPubEntry = pubEntry;
        }
    });

    let response = {
        totalQueries,
        redisChannels,
        totalSize: totalSize + 'B',
        totalObservers,
    };

    if (maxSize) {
        response.maxSize = {
            size: maxSize,
            id: maxSizePubEntry.id
        }
    }

    if (maxObservers) {
        response.maxObservers = {
            count: maxObservers,
            id: maxObserversPubEntry.id
        }
    }

    return response;
}