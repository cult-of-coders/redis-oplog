import { Vent } from 'meteor/skadmin:redis-oplog';
import { Meteor } from 'meteor/meteor';

Vent.publish({
	'threadMessage'({ channel, shouldReturn = true }) {
		if (!channel)
			throw new Meteor.Error('invalid-arguments', 'Please supply a valid channel');

		this.on(channel, object => {
			if (shouldReturn)
				return object;

		});
	},
});

Meteor.methods({
	'vent_emit'({ channel, object, times = 1 }) {
		for (let i = 0; i < times; i++)
			Vent.emit(channel, object);

	},
});
