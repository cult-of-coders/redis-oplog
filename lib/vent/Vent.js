import {getRedisListener, getRedisPusher} from '../redis/getRedisClient';
import {VentConstants} from '../constants';
import {Meteor} from 'meteor/meteor';
import Config from '../config';

// TODO:
// Unify listening of events with RedisSubscriptionManager

export default class Vent {
    /**
     * @param name
     * @param fn
     * @returns {*|any|Observable}
     */
    static publish(name, fn) {
        // check initialization
        if (!Config.isInitialized) {
            throw new Meteor.Error('not-initialized', 'RedisOplog is not initialized at the time of defining this publish. Make sure you initialize it before');
        }

        // validate arguments
        if (!_.isString(name)) {
            if (!_.isObject(name)) {
                throw new Meteor.Error('invalid-definition', 'Argument is invalid')
            }

            _.each(name, (fn, _name) => {
                Vent.publish(_name, fn);
            });

            return;
        } else {
            if (!_.isFunction(fn)) {
                throw new Meteor.Error('invalid-definition', 'The second argument needs to be a function')
            }
        }

        // create the publication properly
        return Meteor.publish(name, function (collectionId, ...args) {
            // We are using peerlibrary:control-mergebox to disable Meteor's mergebox
            this.disableMergebox();

            let handlers = [];
            const context = this;
            const listener = getRedisListener();

            Object.assign(context, {
                on(channel, redisEventHandler) {
                    // listen to redis and bindEnvironment
                    const handler = Meteor.bindEnvironment(function (_channel, _message) {
                        if (_channel === channel) {
                            const message = EJSON.parse(_message);
                            const data = redisEventHandler.call(context, message);

                            if (data) {
                                context.changed(VentConstants.getPrefix(collectionId, name), VentConstants.ID, {
                                    [VentConstants.EVENT_VARIABLE]: data
                                })
                            }
                        }
                    });

                    handlers.push(handler);

                    // subscribe to redis
                    listener.subscribe(channel);

                    listener.addListener('message', handler);
                },
            });

            this.added(VentConstants.getPrefix(collectionId, name), VentConstants.ID, {});

            try {
                fn.call(this, ...args);
            } catch (e) {
                // we do this because the errors in here are silenced
                console.error(e);
                throw e;
            }

            this.onStop(function () {
                handlers.forEach(handler => {
                    listener.removeListener('message', handler);
                })
            });

            this.ready();
        })
    }

    /**
     * @param {string} channel
     * @param {object} object
     */
    static emit(channel, object) {
        const client = getRedisPusher();

        client.publish(channel, EJSON.stringify(object));
    }
}

