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

        let builder = {};
        this.fields.forEach(field => {
            this.embed(builder, this.object, field);
        });

        this.object = builder;
    }

    /**
     * @param target
     * @param source
     * @param field "x.x.x.x"
     */
    embed(target, source, field) {
        let parts = field.split('.');

        if (parts.length === 1) {
            if (source[field] !== undefined) {
                target[field] = source[field];
            }
        } else {
            const first = parts[0];
            if (!_.isObject(source[first])) {
                return;
            }

            target[first] = target[first] || {};
            this.embed(target[first], source[first], parts.slice(1).join('.'))
        }
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