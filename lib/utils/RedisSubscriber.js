import getRedisClient from './getRedisClient';
import { Strategy, Events, RedisPipe } from '../constants';
import { getProcessor } from '../processors';

class RedisSubscriber {
    constructor(observableCollection, strategy, namespace) {
        this.observableCollection = observableCollection;
        this.strategy = strategy;
        this.namespace = namespace;
        this.client = getRedisClient(true);
        this.process = getProcessor(strategy);

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

    subscribeDedicated() {
        const filter = this.observableCollection.selector._id;
        let ids = [];

        if (_.isObject(filter)) {
            if (!filter.$in) {
                throw new Meteor.Error(`When you subscribe directly, you can't have other specified fields rather than $in`);
            }

            ids = filter.$in;
        } else {
            ids.push(filter);
        }

        this.client.subscribe(ids.map(id => {
            return this.namespace + '::' + id
        }));
    }

    subscribeStandard() {
        this.client.subscribe(this.namespace + '::*');
    }

    listen() {
        this.client.on('message', (channel, message) => {
            const data = EJSON.parse(message);

            this.process(
                this.observableCollection,
                data[RedisPipe.EVENT],
                data[RedisPipe.DOC],
                data[RedisPipe.FIELDS],
            )
        });
    }

    stop() {
        this.client.disconnect();
    }
}