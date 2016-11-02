import {_} from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import ObservableCollection from './cache/ObservableCollection';
import { getStrategy, getProcessor } from './processors';
import RedisSubscriber from './utils/RedisSubscriber';


export default class Publication {
    constructor(observer, cursor, namespace) {
        this.observableCollection = new ObservableCollection(observer, cursor);

        this.observer = observer;
        this.cursor = cursor;
        this.collectionName = this.observableCollection.collectionName;

        if (namespace) {
            this.namespaces = _.isArray(namespace) ? namespace : [namespace];
        } else {
            this.namespaces = [this.collectionName];
        }

        this.init();
    }

    /**
     * Initializez subscriptions and the client image on the server
     */
    init() {
        this.observableCollection.init();

        const strategy = getStrategy(
            this.observableCollection.selector,
            this.observableCollection.options
        );

        const subscriber = new RedisSubscriber(this.observableCollection, strategy, this.namespaces);

        this.observer.onStop(() => {
            subscriber.stop();
        });

        this.observer.ready();
    }
}