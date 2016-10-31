import Constants from '../constants';

export default function (client, context, collectionName, isEligibleForQuery) {
    const collectionChannelName = `${collectionName}::*`;

    client.subscribe(collectionChannelName);

    client.on('message', (channel, message) => {
        const data = JSON.parse(message);

        if (data[Constants.TYPE] === Constants.INSERT) {
            if (!isEligibleForQuery(data[Constants.DATA])) {
                return;
            }

            context.added(collectionName, data[Constants.DOCUMENT_ID], data[Constants.DATA]);
        }

        if (data[Constants.TYPE] === Constants.UPDATE) {
            if (!isEligibleForQuery(data[Constants.DATA])) {
                return;
            }

            context.changed(collectionName, data[Constants.DOCUMENT_ID], data[Constants.DATA])
        }

        if (data[Constants.TYPE] === Constants.REMOVE) {
            if (!isEligibleForQuery(data[Constants.DATA])) {
                return;
            }

            context.removed(collectionName, data[Constants.DOCUMENT_ID])
        }
    });
}