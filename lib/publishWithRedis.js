import {Meteor} from 'meteor/meteor';
import {_} from 'meteor/underscore';
import Config from './config';
import PublicationFactory from './cache/PublicationFactory';
import parsePublicationResponse from './utils/parsePublicationResponse';
import debug from './debug';

/*
 Meteor.publishWithRedis(name, function () {
 // direct return cursor or array of cursors

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

    Meteor.publish(name, function (...args) {
        debug('[Main] New incomming subscription for publication: ' + name);

        let {cursors, channels} = parsePublicationResponse(
            fn.call(this, ...args)
        );

        let publicationEntry;

        publicationFactory.queue.runTask(() => {
            publicationEntry = publicationFactory.create(cursors, channels);
            publicationEntry.addObserver(this);
        });

        this.onStop(() => {
            if (!publicationFactory) {
                debug('[Main] PublicationEntry was not properly initialized.');
                return;
            }

            publicationFactory.queue.runTask(() => {
                debug('[Main] Stopping the Meteor subscription for publication: ' + name);
                publicationFactory.removeObserver(publicationEntry, this);
            });
        });

        this.ready();
    })
};
