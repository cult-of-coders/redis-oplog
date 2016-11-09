const RedisPipe = {
    EVENT: 'e',
    DOC: 'd',
    FIELDS: 'f',
    MODIFIER: 'm',
    DOCUMENT_ID: 'id',
    SYNTHETIC: 's'
};

export default RedisPipe;

const Events = {
    INSERT: 'i',
    UPDATE: 'u',
    REMOVE: 'r'
};

const Strategy = {
    DEFAULT: 'D',
    DEDICATED_CHANNELS: 'DC',
    LIMIT_SORT: 'LS'
};

export { Events, Strategy, RedisPipe };