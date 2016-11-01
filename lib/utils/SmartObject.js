import dot from 'dot-object';

class SmartObject {
    constructor(object, fields, sort) {
        this.object = object;
        this.fields = fields ? _.keys(fields) : null;
        this.sort = sort ? _.keys(sort) : null;
    }

    getDotObject() {
        if (!this.dotObject) {
            this.dotObject = dot.dot(this.object);
        }

        return this.dotObject;
    }

    /**
     *
     * @param fields array
     */
    fieldsInSort(fields) {
        if (!this.sort) {
            throw new Meteor.Error('Cannot do this check, because there are no sort values');
        }

        for (var i = 0; i < fields.length; i++) {
            if (_.contains(this.sort, fields[i])) {
                return true;
            }
        }
    }

    cleanObjectAndRetrieve() {
        if (!this.fields) {
            return this.object;
        }

        let tgt = this.getDotObject();
        _.each(tgt, (value, key) => {
            if (key === '_id') {
                return;
            }

            if (!_.contains(fields, key)) {
                delete tgt[key];
            }
        });

        return dot.object(tgt);
    }
}