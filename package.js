Package.describe({
    name: 'cultofcoders:redis-oplog',
    version: '1.2.1-beta',
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
    'redis': '2.7.1',
    'lodash.clonedeep': '4.5.0',
    'deep-extend': '0.4.1',
    'object-sizeof': '1.1.1'
});

Package.onUse(function (api) {
    api.versionsFrom('1.3');
    api.use([
        'underscore',
        'ecmascript',
        'ejson',
        'tmeasday:check-npm-versions@0.3.1',
        'dburles:mongo-collection-instances@0.3.5',
        'minimongo',
        'mongo',
        'random'
    ]);

    api.mainModule('redis-oplog.js', 'server');
});

Package.onTest(function (api) {
    api.use('cultofcoders:redis-oplog');
    api.use('aldeed:collection2@2.10.0');
    api.use('reywood:publish-composite@1.4.2');

    api.use('ecmascript');
    api.use('tracker');
    api.use('mongo');
    api.use('random');
    api.use('matb33:collection-hooks');

    api.use('practicalmeteor:mocha');
    api.use('practicalmeteor:chai');

    api.mainModule('testing/main.server.js', 'server');
    api.addFiles('testing/publishComposite/boot.js', 'server');
    api.addFiles('testing/optimistic-ui/boot.js', 'server');

    api.mainModule('testing/main.client.js', 'client');
});
