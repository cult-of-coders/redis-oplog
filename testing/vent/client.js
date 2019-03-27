import { assert } from 'chai';
import {waitForHandleToBeReady, callWithPromise} from '../lib/sync_utils';
import {Random} from 'meteor/random';
import {Vent} from 'meteor/cultofcoders:redis-oplog';

describe('Vent', function () {
    it('Should receive the event accordingly', async function (done) {
        const threadId = Random.id();
        const channel = `threads::${threadId}::new_message`;

        const handle = Vent.subscribe('threadMessage', {
            channel
        });

        handle.listen(function (message) {
            assert.isObject(message);
            assert.equal('Hello!', message.text);
            handle.stop();
            done();
        });

        Meteor.call('vent_emit', {
            channel,
            object: {text: 'Hello!'}
        })
    });

    it('Should be able to work with 2 different listeners to the same endpoint', async function (done) {
        const threadId = Random.id();
        const channel = `threads::${threadId}::new_message`;

        let inHandle1 = false;
        let inHandle2 = false;

        const handle1 = Vent.subscribe('threadMessage', {channel});

        handle1.listen(function (message) {
            inHandle1 = true;

            if (inHandle2) {
                handle1.stop();
                handle2.stop();
                done();
            }
        });

        const handle2 = Vent.subscribe('threadMessage', {channel});

        handle2.listen(function (message) {
            inHandle2 = true;

            if (inHandle1) {
                handle1.stop();
                handle2.stop();
                done();
            }
        });

        Meteor.call('vent_emit', {
            channel,
            object: {text: 'Hello!'}
        })
    });


    it('Should handle event bombarding and not losing anything along the way', async function (done) {
        const threadId = Random.id();
        const channel = `threads::${threadId}::new_message`;

        const handle = Vent.subscribe('threadMessage', {
            channel
        });

        let count = 0;
        handle.listen(function (message) {
            count++;
            if (count === 100) {
                handle.stop();
                done();
            }
        });

        Meteor.call('vent_emit', {
            channel,
            object: {text: 'Hello!'},
            times: 100
        })
    });


    it('Should not receive the event if handler is stopped', async function (done) {
        const threadId = Random.id();
        const channel = `threads::${threadId}::new_message`;

        const handle = Vent.subscribe('threadMessage', {
            channel
        });

        handle.listen(function (message) {
            done('Should not be here');
        });

        handle.stop();

        Meteor.call('vent_emit', {
            channel,
            object: {text: 'Hello!'}
        });

        setTimeout(function () {
            done();
        }, 200);
    });
});