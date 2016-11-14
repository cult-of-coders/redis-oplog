Package.describe({
    name: 'cultofcoders:redis-oplog',
    version: '1.0.2',
    // Brief, one-line summary of the package.
    summary: 'Replacement for Meteor\'s MongoDB oplog implementation',
    // URL to the Git repository containing the source code for this package.
    git: 'https://github.com/cult-of-coders/redis-oplog',
    // By default, Meteor will default to using README.md for documentation.
    // To avoid submitting documentation, set this field to null.
    documentation: 'README.md'
});

Npm.depends({
    'sift': '3.2.6',
    'dot-object': '1.5.4',
    'redis': '2.6.3',
});

Package.onUse(function (api) {
    api.versionsFrom('1.4.2');
    api.use([
        'underscore',
        'ecmascript',
        'ejson',
        'tmeasday:check-npm-versions@0.3.1',
        'dburles:mongo-collection-instances@0.3.5',
        'mongo'
    ]);

    api.mainModule('redis-oplog.js', 'server');
});

Package.onTest(function (api) {
    api.use('cultofcoders:redis-oplog');

    api.use('ecmascript');
    api.use('tracker');
    api.use('mongo');

    api.use('practicalmeteor:mocha');
    api.use('practicalmeteor:chai');

    api.mainModule('testing/main.server.js', 'server');
    api.mainModule('testing/main.client.js', 'client');
});
