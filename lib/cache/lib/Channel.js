const ChannelType = {
    NAMESPACE: 'N',
    CHANNEL: 'CH',
    COLLECTION: 'C'
};

export { ChannelType }

export default class Channel {
    constructor(type, name) {
        this.type = type;
        this.name = name;
    }

    getString(collectionName) {
        if (this.type === ChannelType.COLLECTION) {
            return collectionName;
        }

        if (this.type === ChannelType.NAMESPACE) {
            return `${collectionName}::${this.name}`;
        }

        return this.name;
    }
}