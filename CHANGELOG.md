## CHANGELOG

### 3.0.1

- Improve and fix link in documentation by [@Float07](https://github.com/Float07)
- Fix issue with Mongo.Collection.__getCollectionByName not resolving 'users' when used in Meteor 3.1 [PR 419](https://github.com/cult-of-coders/redis-oplog/pull/419) by [@dmolin](https://github.com/dmolin)
- Update testing dependencies, removed tests for Meteor 3.0.4 due to new official `roles` package.

### 3.0.0

- Compatibility with Meteor 3

### 2.3.0

- perf: reduce GC pressure by avoiding EJSON.clone [PR 14](https://github.com/Meteor-Community-Packages/redis-oplog/pull/14) by [@alisnic](https://github.com/alisnic)

### 2.2.1

- Update `alanning:roles` to v3.5.1
- Fix reactivity bug in fairly specific situations [#367](https://github.com/cult-of-coders/redis-oplog/issues/367)

### 2.2.0

- Bumped minimum Meteor version to v1.12.2
- Updated tests to cover from Meteor v1.12.2 to the latest v2.12
- Added testing for Redis v7
- Updated `node-redis` to v3.1.2
- Updated `deep-extend` to v0.6.0
- Fix update not returning number
- Fix SyntheticMutator not applying `globalRedisPrefix`

### 2.1.1

- Fixes callback is not a function error when using SyntheticMutator.update

### 2.1.0

- Meteor 2.6 support
- Projections option support
- Update Mocha tests
- Update tests to use Meteor 1.12.2 to fix certificates issues

### 1.2.3

- Redis connection failover handling
- Re-fetching the up-to-date collection when Redis connection resumes
- Bug fixes and improvements

### 1.2.2

- Ability to merge db requests by channel
- Bug fixes and improvements

### 1.2.1

- Bug fixes and improvements

### 1.2.0

- Optimistic UI fixes
- Performance gains for methods
- Fixes for publishComposite
- Other bugs and code quality improvements

### 1.0.5 - 1.0.15

- Bug fixes and improvements

### 1.0.5

- Fix for infinite loop when overriding publish

### 1.0.4

- Fix for update using positional operators

### 1.0.3

- Added support for publish composite
- Fixed randomly failing tests
