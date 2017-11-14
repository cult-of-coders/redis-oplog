import {_} from 'meteor/underscore';

/**
 * Filters out bogus options
 * @param options
 */
export default function (options) {
    return _.extend(
        _.pick(options, [
            'namespace',
            'namespaces',
            'pushToRedis'
        ]),
        {optimistic: true}
    );
}