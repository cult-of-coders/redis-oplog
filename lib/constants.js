const RedisPipe = {
  EVENT: "e",
  DOC: "d",
  FIELDS: "f",
  MODIFIER: "m",
  DOCUMENT_ID: "id",
  SYNTHETIC: "s",
  UID: "u", // this is the unique identity of a change request
  MODIFIED_TOP_LEVEL_FIELDS: "mt",
};

export default RedisPipe;

const Events = {
  INSERT: "i",
  UPDATE: "u",
  REMOVE: "r",
};

const Strategy = {
  DEFAULT: "D",
  DEDICATED_CHANNELS: "DC",
  LIMIT_SORT: "LS",
};

const VentConstants = {
  ID: "i",
  EVENT_VARIABLE: "e",
  PREFIX: "__vent",
  getPrefix(id, name) {
    return `${id}.${name}`;
  },
};

export { Events, Strategy, RedisPipe, VentConstants };
