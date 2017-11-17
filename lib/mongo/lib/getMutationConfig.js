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

    if (collection._redisOplog) {
        const {mutation} = collection._redisOplog;
        if (mutation) {
            mutation.call(collection, config, mutationObject)
        }
    }

    config._channels = getChannels(collectionName, config);

    return config;
};
