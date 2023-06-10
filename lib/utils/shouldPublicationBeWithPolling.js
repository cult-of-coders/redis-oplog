import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

export default function(cursors) {
    let isDisabledOplog = undefined;

    if (cursors.length === 1) {
        const [cursor] = cursors;
        return isOplogDisabled(cursor);
    }

    let disabledConfigs = [];
    cursors.forEach(cursor => {
        disabledConfigs.push(isOplogDisabled(cursor));
    });

    const allTheSame =
        _.every(disabledConfigs, c => c === true) ||
        _.every(disabledConfigs, c => c === false);

    if (!allTheSame) {
        throw new Meteor.Error(
            'The array of cursors returned must all be reactive with oplog or polling, you are not allowed to mix them up.'
        );
    }

    return disabledConfigs[0];
}

/**
 * @param {*} cursor
 */
function isOplogDisabled(cursor) {
    const config = cursor._cursorDescription || { options: {} };

    return !!config.options.disableOplog;
}
