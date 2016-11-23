import getChannelsArray from '../../cache/lib/getChannelsArray';

/**
 * @param _config
 */
export default function (_config) {
    if (!_config) {
        _config = {};
    }

    let config = _.extend({
        pushToRedis: true
    }, _config);

    config._channels = getChannelsArray(config);

    return config;
};
