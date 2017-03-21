import getChannels from '../../cache/lib/getChannels';
import Config from '../../config';

/**
 * @param collectionName
 * @param _config
 */
export default function (collectionName, _config) {
    if (!_config || _.isFunction(_config)) {
        _config = {};
    }

    let config = _.extend({}, Config.mutationDefaults, _config);

    config._channels = getChannels(collectionName, config);

    return config;
};
