import { getRedisListener, getRedisPusher } from './getRedisClient';

/**
 * Manages communication with Redis
 * Unifies all libraries that use this
 */
export default class PubSubManager {
	constructor() {
		this.channelHandlers = {};
		this.queue = new Meteor._SynchronousQueue();

		this.listener = getRedisListener();
		this.pusher = getRedisPusher();

		this._initMessageListener();
	}

	/**
     * Pushes to Redis
     * @param {string} channel
     * @param {object} message
     */
	publish(channel, message) {
		this.pusher.publish(channel, EJSON.stringify(message));
	}

	/**
     * @param {string} channel
     * @param {function} handler
     */
	subscribe(channel, handler) {
		this.queue.queueTask(() => {
			if (!this.channelHandlers[channel])
				this._initChannel(channel);

			this.channelHandlers[channel].push(handler);
		});
	}

	/**
     * @param {string} channel
     * @param {function} handler
     */
	unsubscribe(channel, handler) {
		this.queue.queueTask(() => {
			if (!this.channelHandlers[channel])
				return;

			this.channelHandlers[channel] = this.channelHandlers[channel].filter(_handler => {
				return _handler !== handler;
			});

			if (this.channelHandlers[channel].length === 0)
				this._destroyChannel(channel);

		});
	}

	/**
     * Initializes listening for redis messages
     * @private
     */
	_initMessageListener() {
		const self = this;

		this.listener.on('message', Meteor.bindEnvironment(function(channel, _message) {
			if (self.channelHandlers[channel]) {
				const message = EJSON.parse(_message);

				self.channelHandlers[channel].forEach(channelHandler => {
					channelHandler(message);
				});
			}
		}));
	}

	/**
     * @param channel
     * @private
     */
	_initChannel(channel) {
		this.listener.subscribe(channel);

		this.channelHandlers[channel] = [];
	}

	/**
     * @param channel
     * @private
     */
	_destroyChannel(channel) {
		this.listener.unsubscribe(channel);

		delete this.channelHandlers[channel];
	}
}
