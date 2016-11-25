import getChannels from '../../cache/lib/getChannels';

/**
 * @param collectionName
 * @param _config
 */
export default function (collectionName, _config) {
    if (!_config) {
        _config = {};
    }

    let config = _.extend({
        pushToRedis: true
    }, _config);

    config._channels = getChannels(collectionName, config);

    return config;
};
