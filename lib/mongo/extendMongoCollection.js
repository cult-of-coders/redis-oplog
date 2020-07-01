import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import _validatedInsert from './allow-deny/validatedInsert';
import _validatedUpdate from './allow-deny/validatedUpdate';
import _validatedRemove from './allow-deny/validatedRemove';
import Mutator from './Mutator';
import extendObserveChanges from './extendObserveChanges';

export default () => {
    const Originals = {
        insert: Mongo.Collection.prototype.insert,
        update: Mongo.Collection.prototype.update,
        remove: Mongo.Collection.prototype.remove,
        find: Mongo.Collection.prototype.find,
        findOne: Mongo.Collection.prototype.findOne,
    };

    Mutator.init();

    extendObserveChanges();

    _.extend(Mongo.Collection.prototype, {
        /**
         * @param data
         * @param config
         * @returns {*}
         */
        insert(data, config) {
            return Mutator.insert.call(this, Originals, data, config);
        },

        /**
         * @param selector
         * @param modifier
         * @param config
         * @param callback
         * @returns {*}
         */
        update(selector, modifier, config, callback) {
            return Mutator.update.call(
                this,
                Originals,
                selector,
                modifier,
                config,
                callback
            );
        },

        /**
         * @param selector
         * @param config
         * @returns {*}
         */
        remove(selector, config) {
            return Mutator.remove.call(this, Originals, selector, config);
        },

        _validatedInsert,
        _validatedUpdate,
        _validatedRemove,

        /**
         * Configure defaults for your collection
         *
         * @param {function} mutation
         * @param {function} cursor
         * @param {boolean} shouldIncludePrevDocument
         */
        configureRedisOplog({ mutation, cursor, ...rest }) {
            this._redisOplog = {
                shouldIncludePrevDocument: false,
                protectAgainstRaceConditions: true,
                ...rest
            };

            if (mutation) {
                if (!_.isFunction(mutation)) {
                    throw new Meteor.Error(
                        'To configure defaults for the collection, "mutation" needs to be a function'
                    );
                }

                this._redisOplog.mutation = mutation;
            }
            if (cursor) {
                if (!_.isFunction(cursor)) {
                    throw new Meteor.Error(
                        'To configure defaults for the collection, "cursor" needs to be a function'
                    );
                }

                this._redisOplog.cursor = cursor;
            }
        },
    });
};
