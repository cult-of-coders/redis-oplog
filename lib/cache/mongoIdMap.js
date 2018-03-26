import { IdMap } from 'meteor/id-map';
import { MongoID } from 'meteor/mongo-id';

export class MongoIDMap extends IdMap {
    constructor() {
        super(
            MongoID.idStringify,
            MongoID.idParse,
        );
    }

    pop(id) {
        const key = this._idStringify(id);
        const ret = this._map[key];
        delete this._map[key];
        return ret;
    }

    keys() {
        return _.keys(this._map).map(id => this._idParse(id));
    }

    compareWith(other, callbacks) {
        // shallow clone to protect from mutations during iteration
        const left = Object.assign({}, this._map);
        const right = Object.assign({}, other._map);

        _.each(left, (leftValue, id) => {
            if (_.has(right, id))
                callbacks.both && callbacks.both(this._idParse(id), leftValue, right[id]);
            else
                callbacks.leftOnly && callbacks.leftOnly(this._idParse(id), leftValue);
        });
        if (callbacks.rightOnly) {
            _.each(right, (rightValue, id) => {
                if (!_.has(left, id))
                    callbacks.rightOnly(this._idParse(id), rightValue);
            });
        }

    }
}
