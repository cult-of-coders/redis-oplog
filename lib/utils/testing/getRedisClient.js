import run from '../getRedisClient';

describe('Unit # getRedisClient', function () {
    it('Should work', function () {
        let client = run();

        let client2 = run();

        assert.isTrue(client === client2);

        let client3 = run(true);
        assert.isTrue(client !== client3);
    })
});