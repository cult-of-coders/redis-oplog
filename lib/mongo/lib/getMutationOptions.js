import getChannelsArray from '../../cache/lib/getChannelsArray';

/**
 * @param cb optional callback
 * @param config
 */
export default function (cb, config) {
    let realConfig = {
        callback: undefined,
        config: {
            pushToRedis: true
        }
    };

    if (cb) {
        if (_.isFunction(cb)) {
            realConfig.callback = cb;

            if (config) {
                if (!_.isObject(config)) {
                    throw new Meteor.Error('The configuration for reactivity must be an object');
                }

                _.extend(realConfig.config, config);
            }
        } else if (_.isObject(cb)) {
            _.extend(realConfig.config, cb);
        }
    }

    _.extend(realConfig.config, {
        channels: getChannelsArray(realConfig.config)
    });

    return realConfig;
};
