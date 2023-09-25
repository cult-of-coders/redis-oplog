import { Meteor } from 'meteor/meteor';
import { Orders, Items } from './collections';
import './publication';


Meteor.publish('server_autorun_test', function () {
    this.autorun(async function () {
        const order = await Orders.findOneAsync({valid: true});

        return Items.find({
            orderId: order ? order._id : null
        })
    })
});

Meteor.methods({
    'server_autorun_boot'() {
        Orders.remove({});
        Items.remove({});

        const orderId = Orders.insert({name: 'Order', valid: true});
        Items.insert({name: 'Item 1', orderId});
        Items.insert({name: 'Item 2', orderId});
        Items.insert({name: 'Item 3', orderId});
    },
    'server_autorun_invalidate_order'() {
        Orders.update({}, {
            $set: {valid: false}
        })
    }
});

