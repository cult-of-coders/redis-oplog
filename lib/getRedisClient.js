import Redis from 'ioredis';

let client;

export default function (factory = false) {
    if (factory) {
        return new Redis();
    }

    if (!client) {
        client = new Redis();
    }

    return client;
}