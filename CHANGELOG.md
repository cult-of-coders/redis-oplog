## CHANGELOG

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
