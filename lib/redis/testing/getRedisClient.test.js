import getRedisClient from '../getRedisClient';

describe('Unit # getRedisClient', function () {
    it('Should work', function () {
        let client = getRedisClient();

        let client2 = getRedisClient();

        assert.isTrue(client === client2);

        let client3 = getRedisClient(true);
        assert.isTrue(client !== client3);
    })
});