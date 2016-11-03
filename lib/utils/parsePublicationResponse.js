import { _ } from 'meteor/underscore';
import { Cursor } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import getChannelsArray from './getChannelsArray';
import Channel, { ChannelType } from './Channel';

const getCollectionChannel = () => [new Channel(ChannelType.COLLECTION)];

export default (response) => {
    if (_.isObject(response) && !!response._mongo) {
        return {
            cursors: [response],
            channels: getCollectionChannel()
        }
    }

    if (_.isArray(response)) {
        return {
            cursors: response,
            channels: getCollectionChannel()
        }
    }

    let cursors = [], isSingleCursor;

    if (response.cursor) {
        isSingleCursor = true;
        cursors.push(response.cursor);
    } else if (response.cursors) {
        isSingleCursor = false;
        cursors = response.cursors
    } else {
        throw new Meteor.Error(`You need to have cursors defined`)
    }

    if (!isSingleCursor && response.channel) {
        throw new Meteor.Error(`You are not allowed to have multiple cursors on a single channel.`)
    }

    let channels = getChannelsArray(response);

    if (channels.length === 0) {
        channels = [new Channel(ChannelType.COLLECTION)];
    }

    return {
        cursors,
        channels
    }
}