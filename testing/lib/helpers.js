import { Meteor } from 'meteor/meteor';
import { waitForHandleToBeReady, callWithPromise } from './sync_utils';

export default (suffix) => {
    const create = (...args) => {
        return callWithPromise(`create.${suffix}`, ...args);
    };

    const createSync = async (...args) => {
        return await callWithPromise(`create.${suffix}`, ...args);
    };

    const fetch = (...args) => {
        Meteor.call(`fetch.${suffix}`, ...args);
    };

    const fetchAsync = (...args) => {
        return callWithPromise(`fetch.${suffix}`, ...args);
    };

    const remove = (...args) => {
        Meteor.call(`remove.${suffix}`, ...args);
    };

    const removeAsync = (...args) => {
        return callWithPromise(`remove.${suffix}`, ...args);
    };

    const update = (...args) => {
        Meteor.call(`update.${suffix}`, ...args);
    };

    const updateAsync = (...args) => {
        return callWithPromise(`update.${suffix}`, ...args);
    };

    const upsert = (...args) => {
        Meteor.call(`upsert.${suffix}`, ...args);
    };

    const upsertAsync = (...args) => {
        return callWithPromise(`upsert.${suffix}`, ...args);
    };

    const synthetic = (...args) => {
        Meteor.call(`synthetic.${suffix}`, ...args);
    };

    const syntheticAsync = (...args) => {
        return callWithPromise(`synthetic.${suffix}`, ...args);
    };

    const subscribe = (...args) => {
        return Meteor.subscribe(`publication.${suffix}`, ...args);
    };

    return {
        create,
        createSync,
        update,
        updateAsync,
        upsert,
        upsertAsync,
        fetch,
        fetchAsync,
        remove,
        removeAsync,
        subscribe,
        synthetic,
        syntheticAsync,
        waitForHandleToBeReady
    }
}
