Package.describe({
    name: 'cultofcoders:redis-oplog',
    version: '1.2.6_2',
    // Brief, one-line summary of the package.
    summary: "Replacement for Meteor's MongoDB oplog implementation",
    // URL to the Git repository containing the source code for this package.
    git: 'https://github.com/cult-of-coders/redis-oplog',
    // By default, Meteor will default to using README.md for documentation.
    // To avoid submitting documentation, set this field to null.
    documentation: 'README.md',
});

Npm.depends({
    'deep-diff': '0.3.8',
    redis: '2.8.0',
    'deep-extend': '0.5.0',
    'object-sizeof': '1.2.0',
    'lodash.clonedeep': '4.5.0',
});

Package.onUse(function(api) {
    api.versionsFrom('1.5.1');
    api.use([
        'underscore',
        'ecmascript',
        'ejson',
        'minimongo',
        'mongo',
        'random',
        'ddp-server',
        'diff-sequence',
    ]);

    api.mainModule('redis-oplog.js', 'server');
    api.mainModule('redis-oplog.client.js', 'client');
});

Package.onTest(function(api) {
    api.use('cultofcoders:redis-oplog');

    // extensions
    api.use('aldeed:collection2@3.0.0');
    api.use('reywood:publish-composite@1.5.2');
    api.use('natestrauser:publish-performant-counts@0.1.2');
    api.use('socialize:user-presence@0.4.0');

    api.use('ecmascript');
    api.use('tracker');
    api.use('mongo');
    api.use('random');
    api.use('accounts-password');
    api.use('matb33:collection-hooks@0.8.4');
    api.use('alanning:roles@1.2.16');

    api.use(['cultofcoders:mocha', 'practicalmeteor:chai']);

    api.mainModule('testing/main.server.js', 'server');
    api.addFiles('testing/publishComposite/boot.js', 'server');
    api.addFiles('testing/optimistic-ui/boot.js', 'server');

    api.mainModule('testing/main.client.js', 'client');
});
