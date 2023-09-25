import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

const callWithPromise = async (method, ...args) => {
    const result = await Meteor.callAsync(method, ...args);
    return await result.stubValuePromise;
};

Meteor.callWithPromise = callWithPromise;

const waitForHandleToBeReady = handle => {
    return new Promise((resolve) => {
        Tracker.autorun(c => {
            if (handle.ready()) {
                c.stop();

                resolve();
            }
        });
    });
};

export { callWithPromise, waitForHandleToBeReady };
