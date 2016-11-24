import getChannelsArray, { getChannelStrings } from '../../cache/lib/getChannelsArray';

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

    config._channels = getChannelStrings(collectionName, getChannelsArray(config));

    return config;
};
