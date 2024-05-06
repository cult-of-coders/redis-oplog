import { Collections } from './boot';

import '../lib/utils/testing';
import '../lib/cache/testing';
import '../lib/processors/testing';
import '../lib/redis/testing';
import './initial_add';
import './collection_hooks.server';
import './observe_callbacks.server';
// import './mutation_callbacks';
import './collection_transform';
// import './server-autorun/server';
import './transformations/server';
import './custom-publications/server';
import './vent/server';
import './accounts/server';
import './collection-defaults/server';
import './polling/server';
import './object-id/server';
import './include_prev_doc';
import './return_value';


Meteor.startup(async () => {
    for (const Collection of Object.values(Collections)) {
        await Collection.removeAsync({});

        await Collection.insertAsync({
            title: 'A',
            score: 20,
            game: 'chess'
        });

        await Collection.insertAsync({
            title: 'B',
            score: 30,
            game: 'chess'
        });

        await Collection.insertAsync({
            title: 'C',
            score: 10,
            game: 'domino'
        });

        await Collection.insertAsync({
            title: 'D',
            score: 40,
            game: 'chess'
        });
    }
})
