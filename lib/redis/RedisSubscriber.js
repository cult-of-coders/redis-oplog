import { Strategy } from '../constants';
import { getProcessor } from '../processors';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import extractIdsFromSelector from '../utils/extractIdsFromSelector';
import RedisSubscriptionManager from './RedisSubscriptionManager';
import syntheticProcessor from '../processors/synthetic';

export default class RedisSubscriber {
    /**
     * @param observableCollection
     * @param strategy
     * @param channelsObjects {Array<Channel>}
     */
    constructor(observableCollection, strategy, channelsObjects) {
        this.observableCollection = observableCollection;
        this.strategy = strategy;
        this.processor = getProcessor(strategy);
        this.channels = this.getChannels(channelsObjects);
        this.queue = new Meteor._SynchronousQueue();

        RedisSubscriptionManager.attach(this);
    }

    /**
     * @param channels
     * @returns {*}
     */
    getChannels(channels) {
        const collectionName = this.observableCollection.collectionName;

        switch (this.strategy) {
            case Strategy.DEFAULT:
            case Strategy.LIMIT_SORT:
                return channels;
            case Strategy.DEDICATED_CHANNELS:
                const ids = extractIdsFromSelector(this.observableCollection.selector);

                return ids.map(id => collectionName + '::' + id);
            default:
                throw new Meteor.Error(`Strategy could not be found: ${this.strategy}`)
        }
    }

    /**
     * @param event {String}
     * @param doc {Object}
     * @param fields {Array<String>}
     * @param isSynthetic {Boolean}
     */
    process(event, doc, fields, isSynthetic) {
        if (isSynthetic) {
            return this.queue.queueTask(() => {
                syntheticProcessor(this.observableCollection, event, doc);
            })
        }

        this.queue.queueTask(() => {
            this.processor.call(
                null,
                this.observableCollection,
                event,
                doc,
                fields
            )
        })
    }

    /**
     * Clears the task queue, and detaches from RedisSubscriptionManager
     */
    stop() {
        try {
            this.queue._taskHandles.clear();
            RedisSubscriptionManager.detach(this);
        } catch (e) {
            console.warn(`[RedisSubscriber] Weird! There was an error while stopping the publication: `, e);
        }
    }
}