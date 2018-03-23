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

    const defaultOverrides = {};
    if (!DDP._CurrentMethodInvocation.get()) {
        // If we're not in a method, then we should never need to do optimistic
        // ui processing.
        //
        // However, we allow users to really force it by explicitly passing
        // optimistic: true if they want to use the local-dispatch code path
        // rather than going through Redis.
        defaultOverrides.optimistic = false;
    }

    let config = _.extend({}, Config.mutationDefaults, defaultOverrides, _config);

    if (collection._redisOplog) {
        const {mutation} = collection._redisOplog;
        if (mutation) {
            mutation.call(collection, config, mutationObject)
        }
    }

    config._channels = getChannels(collectionName, config);

    return config;
};
