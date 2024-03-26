import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

const callWithPromise = (method, ...args) => {
    return new Promise((resolve, reject) => {
        Meteor.call(method, ...args, (err, res) => {
            if (err) reject(err.reason || 'Something went wrong.');

            resolve(res);
        });
    });
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
