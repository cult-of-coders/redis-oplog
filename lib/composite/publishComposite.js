import { _ } from 'meteor/underscore';
import PublicationConfig from './PublicationConfig';

/**
 * @param name
 * @param config
 */
export default function (name, config) {
    Meteor.publish(name, function (...args) {
        if (_.isFunction(fn)) {
            config = config.call(this, ...args);
        }

        const publicationConfig = new PublicationConfig({
            name,
            observer: this,
            config
        });

        this.onStop(() => {
            publicationConfig.stop();
        });

        this.ready();
    })
}