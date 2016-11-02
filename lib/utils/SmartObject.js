import dot from 'dot-object';

/**
 * This object allows us to perform various checks on an object like whether or not it has fields
 * in sort, or others.
 */
export default class SmartObject {
    constructor(object, fields, sort, affectedFields) {
        this.object = object;

        this.storeElements('fields', fields);
        this.storeElements('sort', sort);

        this.affectedFields = affectedFields;
    }

    storeElements(type, value) {
        if (value) {
            const subvalues = _.keys(value);
            if (subvalues.length) {
                this[type] = subvalues;
            }
        }
    }

    /**
     * @returns {*}
     */
    getDotObject() {
        if (!this.dotObject) {
            this.dotObject = dot.dot(this.object);
        }

        return this.dotObject;
    }

    /**
     * @returns {boolean}
     */
    affectedFieldsExistInSort() {
        if (!this.sort) {
            return false;
        }

        for (var i = 0; i < this.affectedFields.length; i++) {
            if (_.contains(this.sort, this.affectedFields[i])) {
                return true;
            }
        }
    }

    /**
     * @param fields array
     */
    affectedFieldsExistInFieldsOptions(fields) {
        if (!this.fields) {
            throw new Meteor.Error('Cannot do this check, because there are no sort values');
        }

        for (var i = 0; i < this.affectedFields.length; i++) {
            if (_.contains(this.fields, this.affectedFields[i])) {
                return true;
            }
        }
    }

    clean() {
        if (!this.fields) {
            return;
        }

        // TODO: this may be heavy, maybe cheaper to check first if the object contains nested fields (?)
        let tgt = this.getDotObject();
        _.each(tgt, (value, key) => {
            if (key === '_id') {
                return;
            }

            if (!_.contains(this.fields, key)) {
                delete tgt[key];
            }
        });

        this.object = dot.object(tgt);
    }

    /**
     * @returns {*}
     */
    cleanAndRetrieve() {
        this.clean();

        return this.object;
    }
}