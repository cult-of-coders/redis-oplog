import { _ } from 'meteor/underscore';

export default (fields) => {
    for (let value in fields) {
        return value !== 1;
    }
}