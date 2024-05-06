export default (fields) => {
  for (let value in fields) {
    return fields[value] !== 1;
  }
};
