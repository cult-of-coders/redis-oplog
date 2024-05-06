import { Meteor } from 'meteor/meteor';
import { waitForHandleToBeReady, callWithPromise } from './sync_utils';
import {Collections} from "../boot";

export default (suffix) => {
    const create = (...args) => {
        Meteor.call(`create.${suffix}`, ...args);
    };

    const createSync = (...args) => {
        return callWithPromise(`create.${suffix}`, ...args);
    };

    const fetch = (...args) => {
        Meteor.call(`fetch.${suffix}`, ...args);
    };

    const fetchSync = (...args) => {
        return callWithPromise(`fetch.${suffix}`, ...args);
    };

    const remove = (...args) => {
        Meteor.call(`remove.${suffix}`, ...args);
    };

    const removeSync = (...args) => {
        return callWithPromise(`remove.${suffix}`, ...args);
    };

    const update = (...args) => {
        Meteor.call(`update.${suffix}`, ...args);
    };

    const updateSync = (...args) => {
        return callWithPromise(`update.${suffix}`, ...args);
    };

    const upsert = (...args) => {
        Meteor.call(`upsert.${suffix}`, ...args);
    };

    const upsertSync = (...args) => {
        return callWithPromise(`upsert.${suffix}`, ...args);
    };

    const synthetic = (...args) => {
        Meteor.call(`synthetic.${suffix}`, ...args);
    };

    const syntheticSync = (...args) => {
        return callWithPromise(`synthetic.${suffix}`, ...args);
    };

    const subscribe = (...args) => {
        return Meteor.subscribe(`publication.${suffix}`, ...args);
    };

    return {
        create,
        createSync,
        update,
        updateSync,
        upsert,
        upsertSync,
        fetch,
        fetchSync,
        remove,
        removeSync,
        subscribe,
        synthetic,
        syntheticSync,
        waitForHandleToBeReady
    }
}
