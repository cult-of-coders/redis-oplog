import Constants from '../constants';

export default function (client, context, collectionName, ids) {
    const collectionChannelName = `${collectionName}::_id`;

    let channels = _.map(ids, id => {
        return `${collectionName}::${id}`
    });

    client.subscribe(channels);

    client.on('message', (channel, message) => {
        const data = JSON.parse(message);

        const id = channel.split('::')[1];

        if (data[Constants.TYPE] === Constants.UPDATE) {
            context.changed(collectionName, id, data[Constants.DATA])
        }

        if (data[Constants.TYPE] === Constants.REMOVE) {
            context.removed(collectionName, id)
        }
    });
}