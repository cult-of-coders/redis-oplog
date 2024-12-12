import { _ } from "meteor/underscore";

const deepFilterFieldsArray = ["$and", "$or", "$nor"];
const deepFilterFieldsObject = ["$not"];

/**
 * Given a complex filtering option, extract the fields
 * @param filters
 */
function extractFieldsFromFilters(filters) {
  let filterFields = [];

  _.each(filters, (value, field) => {
    if (field[0] !== "$") {
      filterFields.push(field);
    }
  });

  deepFilterFieldsArray.forEach((field) => {
    if (filters[field]) {
      filters[field].forEach((element) => {
        filterFields = _.union(filterFields, extractFieldsFromFilters(element));
      });
    }
  });

  deepFilterFieldsObject.forEach((field) => {
    if (filters[field]) {
      filterFields = _.union(
        filterFields,
        extractFieldsFromFilters(filters[field])
      );
    }
  });

  return filterFields;
}

export default extractFieldsFromFilters;
