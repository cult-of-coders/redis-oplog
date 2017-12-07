import getChannels from '../../cache/lib/getChannels';
import Config from '../../config';

/**
 * @param collection
 * @param _config
 * @param mutationObject
 */
export default function (collection, _config, mutationObject) {
    const collectionName = collection._name;

    if (!_config || _.isFunction(_config)) {
        _config = {};
    }

    let config = _.extend({}, Config.mutationDefaults, _config);

    config._channels = getChannels(collectionName, config);

    return config;
};
