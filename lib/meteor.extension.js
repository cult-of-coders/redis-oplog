import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
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
_.extend(Meteor, {
    publishWithRedis(name, fn) {
        if (!Config.isInitialized) {
            throw new Meteor.Error(`RedisOplog is not initialized`)
        }

        const publicationFactory = new PublicationFactory(name);

        debug('Created publication with name:' + name);

        Meteor.publish(name, function (...args) {
            debug('New incomming subscription for publication: ' + name);

            let {cursors, channels} = parsePublicationResponse(
                fn.call(this, ...args)
            );

            let id = publicationFactory.getPublicationId(cursors, channels);

            let publicationEntry;

            publicationFactory.queue.runTask(() => {
                publicationEntry = publicationFactory.create(id, cursors, channels);
                publicationEntry.addObserver(this);
            });

            this.onStop(() => {
                publicationFactory.queue.runTask(() => {
                    publicationFactory.removeObserver(publicationEntry, this);
                });
            });

            this.ready();
        })
    }
});
