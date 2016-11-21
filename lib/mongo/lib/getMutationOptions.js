import getChannelsArray from '../../cache/lib/getChannelsArray';

/**
 * @param cb optional callback
 * @param config
 */
export default function (type, ...args) {
    const config = {
        pushToRedis: true
    };

    this._redisOptions.forEach((fn) => {
        const cfg = fn(type, ...args)
        if (cfg) {
            if (!_.isObject(cfg)) {
                throw new Meteor.Error('The configuration for reactivity must be an object');
            }
            _.extend(config, cfg);
        }
    })
    _.extend(config, {
        channels: getChannelsArray(config)
    });

    return config;
};
