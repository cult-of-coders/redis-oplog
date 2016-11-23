import dot from 'dot-object';
import { _ } from 'meteor/underscore';

/**
 * This object allows us to perform various checks on an object like whether or not it has fields
 * in sort, or others.
 */
export default class SmartObject {
    /**
     * @param object
     * @param fields
     * @param sort
     */
    constructor(object, fields, sort) {
        this.object = object;

        this.storeElements('fields', fields);
        this.storeElements('sort', sort);
    }

    /**
     * @param type
     * @param value
     */
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
     * @param fields array
     * @returns {Boolean}
     */
    fieldsExistInSortOptions(fields) {
        if (!this.sort) {
            return false;
        }

        for (var i = 0; i < this.sort.length; i++) {
            if (_.contains(fields, this.sort[i])) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param fields array
     * @returns {Boolean}
     */
    fieldsExistInFieldsOptions(fields) {
        if (!this.fields) {
            return false;
        }

        for (var i = 0; i < this.fields.length; i++) {
            if (_.contains(fields, this.fields[i])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Makes the current object stored, cleaned by the allowed fields.
     */
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

            if (!this.isFieldEligibleForFields(key)) {
                delete tgt[key];
            }
        });

        this.object = dot.object(tgt);
    }

    /**
     * Performs the check to verify if a certain key should be in fields
     * @param key
     * @return {Boolean}
     */
    isFieldEligibleForFields(key) {
        for (var i = 0; i < this.fields.length ; i++) {
            const field = this.fields[i];
            if (
                field === key
                || key.substr(0, field.length + 1) === (field + '.')
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Cleans the objects and retrieves it
     *
     * @returns {*}
     */
    cleanAndRetrieve() {
        this.clean();

        return this.object;
    }
}