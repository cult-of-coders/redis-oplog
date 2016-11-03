import { Strategy, Events, RedisPipe } from '../constants';
import { getProcessor } from '../processors';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import extractIdsFromSelector from '../utils/extractIdsFromSelector';
import debug from '../debug';

export default class RedisSubscriber {
    /**
     * @param client
     * @param observableCollection
     * @param strategy
     * @param channels {Array<Channel>}
     */
    constructor(client, observableCollection, strategy, channels) {
        this.client = client;
        this.observableCollection = observableCollection;
        this.strategy = strategy;
        this.channels = channels;
        this.process = getProcessor(strategy);
        this._queue = new Meteor._SynchronousQueue();

        switch (strategy) {
            case Strategy.DEFAULT:
            case Strategy.LIMIT_SORT:
                this.subscribeStandard();
                break;
            case Strategy.DEDICATED_CHANNELS:
                this.subscribeDedicated();
                break;
            default:
                throw new Meteor.Error(`Strategy could not be found: ${strategy}`)
        }

        this.listen();
    }

    /**
     * Subscribes only to the specific _ids from within the collection
     * Namespaces are basically ignored.
     */
    subscribeDedicated() {
        const ids = extractIdsFromSelector(this.observableCollection.selector);

        this.client.subscribe(ids.map(id => {
            return this.observableCollection.collectionName + '::' + id
        }));
    }

    /**
     * Subscribes to the given channels
     */
    subscribeStandard() {
        const collectionName = this.observableCollection.collectionName;
        this.channels.forEach(channelObject => {
            const channelName = channelObject.getString(collectionName);
            debug('Redis subscribing to: ' + channelName);

            this.client.subscribe(channelName);
        })
    }

    /**
     * Starts listening for messages on the subscribed channels
     */
    listen() {
        this.client.on('message', Meteor.bindEnvironment((channel, message) => {
            debug('Incomming message on channel: ' + channel);
            this._queue.queueTask(() => {
                const data = EJSON.parse(message);

                this.process(
                    this.observableCollection,
                    data[RedisPipe.EVENT],
                    data[RedisPipe.DOC],
                    data[RedisPipe.FIELDS],
                )
            })
        }));
    }

    /**
     * Disconnects the client
     */
    stop() {
        try {
            // empty the queue for other tasks that may have appeared.
            this._queue._taskHandles.clear();
        } catch (e) {
            console.warn(`Weird! There was an error while stopping the publication: `, e);
        }
    }
}