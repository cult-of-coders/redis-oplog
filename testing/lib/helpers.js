const callWithPromise = (method, ...args) => {
    return new Promise((resolve, reject) => {
        Meteor.call(method, ...args, (err, res) => {
            if (err) reject(err.reason || 'Something went wrong.');

            resolve(res);
        });
    });
};

export default (suffix) => {
    const create = (...args) => {
        Meteor.call(`create.${suffix}`, ...args);
    };

    const createSync = (...args) => {
        return callWithPromise(`create.${suffix}`, ...args);
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

    const synthetic = (...args) => {
        Meteor.call(`synthetic.${suffix}`, ...args);
    };

    const syntheticSync = (...args) => {
        return callWithPromise(`synthetic.${suffix}`, ...args);
    };

    const subscribe = (...args) => {
        return Meteor.subscribe(`publication.${suffix}`, ...args);
    };


    const waitForHandleToBeReady = (handle) => {
        return new Promise((resolve, reject) => {
            Tracker.autorun(c => {
                if (handle.ready()) {
                    c.stop();

                    resolve();
                }
            })
        })
    };

    return {
        create,
        createSync,
        update,
        updateSync,
        remove,
        removeSync,
        subscribe,
        synthetic,
        syntheticSync,
        waitForHandleToBeReady
    }
}