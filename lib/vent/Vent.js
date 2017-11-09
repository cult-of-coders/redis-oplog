import {getRedisListener, getRedisPusher} from '../redis/getRedisClient';
import {VentConstants} from '../constants';
import {Meteor} from 'meteor/meteor';
import {Random} from 'meteor/random';
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

        if (_.isObject(name)) {
            _.each(name, (fn, _name) => {
                Vent.publish(_name, fn);
            });

            return;
        }

        // validate if everything is in order
        Vent._validateArguments(name, fn);

        // create the publication properly
        return Vent._createPublishEndPoint(name, fn);
    }

    /**
     * @param {string} channel
     * @param {object} object
     */
    static emit(channel, object) {
        const {pubSubManager} = Config;

        pubSubManager.publish(channel, object);
    }

    /**
     * Creates the publish endpoint
     *
     * @param name
     * @param fn
     * @returns {*|any|Observable}
     * @private
     */
    static _createPublishEndPoint(name, fn) {
        return Meteor.publish(name, function (collectionId, ...args) {
            // We are using peerlibrary:control-mergebox to disable Meteor's mergebox
            this.disableMergebox();
            Vent._extendPublishContext(this, name, collectionId);

            this.added(VentConstants.getPrefix(collectionId, name), VentConstants.ID, {});

            try {
                fn.call(this, ...args);
            } catch (e) {
                // we do this because the errors in here are silenced
                console.error(e);
                throw e;
            }

            this.ready();
        });
    }

    /**
     * @param context
     * @param name
     * @param collectionId
     * @private
     */
    static _extendPublishContext(context, name, collectionId) {
        let channelHandlers = {};
        const {pubSubManager} = Config;

        Object.assign(context, {
            on(channel, redisEventHandler) {
                // listen to redis and bindEnvironment
                pubSubManager.subscribe(channel, function(message) {
                    const data = redisEventHandler.call(context, message);

                    if (data) {
                        context.changed(VentConstants.getPrefix(collectionId, name), VentConstants.ID, {
                            [VentConstants.EVENT_VARIABLE]: data
                        })
                    }
                });

                if (!channelHandlers[channel]) {
                    channelHandlers[channel] = [];
                }

                channelHandlers[channel].push(redisEventHandler);
            },
        });

        context.onStop(function () {
            _.each(channelHandlers, (handlers, channel) => {
                handlers.forEach(handler => {
                    pubSubManager.unsubscribe(channel, handler);
                })
            });
        });
    }

    /**
     * @param name
     * @param fn
     * @private
     */
    static _validateArguments(name, fn) {
        // validate arguments
        if (!_.isString(name)) {
            if (!_.isObject(name)) {
                throw new Meteor.Error('invalid-definition', 'Argument is invalid')
            }

        } else {
            if (!_.isFunction(fn)) {
                throw new Meteor.Error('invalid-definition', 'The second argument needs to be a function')
            }
        }
    }
}

