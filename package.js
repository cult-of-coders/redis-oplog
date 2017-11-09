Package.describe({
    name: 'cultofcoders:redis-oplog',
    version: '1.2.4_1',
    // Brief, one-line summary of the package.
    summary: 'Replacement for Meteor\'s MongoDB oplog implementation',
    // URL to the Git repository containing the source code for this package.
    git: 'https://github.com/cult-of-coders/redis-oplog',
    // By default, Meteor will default to using README.md for documentation.
    // To avoid submitting documentation, set this field to null.
    documentation: 'README.md'
});

Npm.depends({
    'deep-diff': '0.3.4',
    'dot-object': '1.5.4',
    'redis': '2.8.0',
    'deep-extend': '0.4.1',
    'object-sizeof': '1.1.1',
    'lodash.clonedeep': '4.5.0',
});

Package.onUse(function (api) {
    api.versionsFrom('1.3');
    api.use([
        'underscore',
        'ecmascript',
        'ejson',
        'dburles:mongo-collection-instances@0.3.5',
        'peerlibrary:publish-context@0.5.0',
        'peerlibrary:control-mergebox@0.3.0',
        'minimongo',
        'mongo',
        'random'
    ]);

    api.mainModule('redis-oplog.js', 'server');
    api.mainModule('redis-oplog.client.js', 'client');
});

Package.onTest(function (api) {
    api.use('cultofcoders:redis-oplog');

    // extensions
    api.use('aldeed:collection2@2.10.0');
    api.use('reywood:publish-composite@1.5.2');
    api.use('peerlibrary:reactive-publish@0.5.0');
    api.use('natestrauser:publish-performant-counts@0.1.2');
    api.use('socialize:user-presence@0.4.0');

    api.use('ecmascript');
    api.use('tracker');
    api.use('mongo');
    api.use('random');
    api.use('accounts-password');
    api.use('matb33:collection-hooks');
    api.use('alanning:roles@1.2.16');

    api.use([
        'coffeescript@1.12.7_3',
        'practicalmeteor:mocha@2.4.5_6',
        'practicalmeteor:chai'
    ]);

    api.mainModule('testing/main.server.js', 'server');
    api.addFiles('testing/publishComposite/boot.js', 'server');
    api.addFiles('testing/optimistic-ui/boot.js', 'server');

    api.mainModule('testing/main.client.js', 'client');
});
