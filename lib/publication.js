import {_} from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import ObservableCollection from './cache/ObservableCollection';
import { getStrategy, getProcessor } from './processors';
import RedisSubscriber from './utils/RedisSubscriber';

class Publication {
    constructor(observer, cursor) {
        this.observer = observer;
        this.cursor = cursor;
        this.observableCollection = new ObservableCollection(observer, cursor);
    }

    init(observer) {
        this.observableCollection.init();

        const name = this.observableCollection.collectionName;

        const strategy = getStrategy(
            this.observableCollection.selector,
            this.observableCollection.options
        );

        const subscriber = new RedisSubscriber(this.observableCollection, strategy, name);

        observer.onStop(() => {
            subscriber.stop();
        });

        observer.ready();
    }
}