import '../lib/utils/testing';
import '../lib/cache/testing';
import '../lib/processors/testing';

import { RedisCollection } from './boot';

RedisCollection.remove({});

RedisCollection.insert({
    title: 'A',
    score: 20,
    game: 'chess'
});

RedisCollection.insert({
    title: 'B',
    score: 30,
    game: 'chess'
});

RedisCollection.insert({
    title: 'C',
    score: 10,
    game: 'domino'
});

RedisCollection.insert({
    title: 'D',
    score: 40,
    game: 'chess'
});