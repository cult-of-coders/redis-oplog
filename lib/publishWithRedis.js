import {Meteor} from 'meteor/meteor';
import {_} from 'meteor/underscore';
import shouldPublicationBeWithPolling from './utils/shouldPublicationBeWithPolling';
import PublicationFactory from './cache/PublicationFactory';
import debug from './debug';

/*

Meteor.publishWithRedis(name, function () {
 // return cursor or array of cursors

 // custom
 return {
     cursor: Mongo.Cursor
     cursors: Array<Mongo.Cursor>
     namespace: String
     channel: String
 }
})

*/
export default function publishWithRedis(name, fn) {
    if (_.isObject(name)) {
        return _.each(name, (value, key) => {
            publishWithRedis(key, value);
        })
    }

    const publicationFactory = new PublicationFactory(name);

    debug('[Main] Created publication with name: ' + name);

    Meteor.defaultPublish(name, function (...args) {
        debug('[Main] New incomming subscription for publication: ' + name);

        let cursors = fn.call(this, ...args);
        if (!cursors) {
            return;
        }

        if (!_.isArray(cursors)) {
            cursors = [cursors];
        }

        if (shouldPublicationBeWithPolling(cursors)) {
            return cursors;
        }

        let publicationEntry;

        publicationFactory.queue.runTask(() => {
            publicationEntry = publicationFactory.create(cursors);
            publicationEntry.addObserver(this);
        });

        this.onStop(() => {
            publicationFactory.queue.runTask(() => {
                debug('[Main] Stopping the Meteor subscription for publication: ' + name);
                publicationFactory.removeObserver(publicationEntry, this);
            });
        });

        this.ready();
    })
};
