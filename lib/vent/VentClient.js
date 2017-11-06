import {VentConstants} from '../constants';
import {Random} from 'meteor/random';

/**
 * Creates subscriptions in a friendly manner
 */
export default class VentClient {
    static subscribe(name, ...args) {
        const subscription = new VentClientSubscription(name);

        return subscription.subscribe(...args);
    }
}

/**
 * Handles Vent subscription
 */
class VentClientSubscription {
    constructor(name) {
        this._name = name;
        this._id = Random.id();
        this._collectionName = VentConstants.getPrefix(this._id, name);

        this.collection = new Mongo.Collection(this._collectionName);
        this.cursor = this.collection.find();
    }

    /**
     * Subscribes to Meteor
     *
     * @param args
     * @returns {*}
     */
    subscribe(...args) {
        const self = this;

        const handler = Meteor.subscribe(this._name, this._id, ...args);
        this.initCollectionWatch();

        const oldStop = handler.stop;
        Object.assign(handler, {
            listen(eventHandler) {
                if (!_.isFunction(eventHandler)) {
                    throw new Meteor.Error('invalid-argument', 'You should pass a function to listen()');
                }

                self._eventHandler = eventHandler;
            },
            stop() {
                if (self._observeChangesHandle) {
                    self._observeChangesHandle.stop();
                }

                return oldStop.call(handler);
            }
        });

        return handler;
    }

    /**
     * Watches the incomming events
     */
    initCollectionWatch() {
        const self = this;

        this._observeChangesHandle = this.cursor.observeChanges({
            changed(_id, data) {
                const event = data[VentConstants.EVENT_VARIABLE];

                if (self._eventHandler) {
                    self._eventHandler(event);
                }
            }
        })
    }
}