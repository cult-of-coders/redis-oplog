import { Meteor } from 'meteor/meteor';

export default function (cursors) {
    let isDisabledOplog = undefined;

    cursors.forEach(cursor => {
        let config = cursor._cursorDescription || {};

        if (isDisabledOplog !== undefined && isDisabledOplog != !!config.disableOplog) {
            throw new Meteor.Error('The array of cursors returned must all be reactive with oplog or polling, you are not allowed to mix them up.');
        }

        isDisabledOplog = !!config.disableOplog;
    });

    return isDisabledOplog;
}