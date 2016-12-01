import {Collections, config} from './boot';
import {_} from 'meteor/underscore';
import './synthetic_mutators';

_.each(Collections, (Collection, key) => {
    const create = (...args) => {
        Meteor.call(`create.${config[key].suffix}`, ...args);
    };

    const remove = (...args) => {
        Meteor.call(`remove.${config[key].suffix}`, ...args);
    };

    const update = (...args) => {
        Meteor.call(`update.${config[key].suffix}`, ...args);
    };

    const subscribe = (...args) => {
        return Meteor.subscribe(`publication.${config[key].suffix}`, ...args);
    };

    const onHandleReady = (handle, callback) => {
        Tracker.autorun(c => {
            if (handle.ready()) {
                c.stop();

                callback();
            }
        })
    };

    describe('It should work with: ' + key, function () {
        it('Should detect a removal', function (done) {
            let handle = subscribe({
                game: 'chess',
            }, {
                sort: {score: -1},
                limit: 5
            });

            const cursor = Collection.find();
            var idOfInterest;

            let observeChangesHandle = cursor.observeChanges({
                removed(docId) {
                    if (docId == idOfInterest) {
                        observeChangesHandle.stop();
                        handle.stop();
                        done();
                    }
                }
            });

            Tracker.autorun((c) => {
                if (handle.ready()) {
                    c.stop();

                    create({
                        game: 'chess',
                        title: 'E'
                    }, (err, _id) => {
                        idOfInterest = _id;
                        Meteor.setTimeout(() => {
                            remove({_id});
                        }, 100);
                    });
                }
            });
        });

        it('Should detect an insert', function (done) {
            let handle = subscribe({
                game: 'chess',
            }, {
                sort: {score: -1},
                limit: 5
            });

            const cursor = Collection.find();

            let observeChangesHandle = cursor.observeChanges({
                added(docId, doc) {
                    if (doc.title === 'E') {
                        observeChangesHandle.stop();
                        handle.stop();
                        remove({_id: docId}, function () {
                            done();
                        });
                    }
                }
            });

            Tracker.autorun((c) => {
                if (handle.ready()) {
                    c.stop();
                    let data = cursor.fetch();

                    assert.lengthOf(data, 3);

                    create({
                        game: 'chess',
                        title: 'E'
                    });
                }
            });
        });

        it('Should detect an update', function (done) {
            let handle = subscribe({
                game: 'chess',
            }, {
                sort: {score: -1},
                limit: 5
            });

            const cursor = Collection.find();

            const observeChangesHandle = cursor.observeChanges({
                changed(docId) {
                    observeChangesHandle.stop();
                    handle.stop();
                    done();
                }
            });

            Tracker.autorun((c) => {
                if (handle.ready()) {
                    c.stop();
                    let data = cursor.fetch();

                    update({_id: data[0]._id}, {
                        $set: {
                            score: Math.random()
                        }
                    });
                }
            });
        });

        it('Should detect an update nested', function (done) {
            let handle = subscribe({
                game: 'chess',
            });

            create({
                game: 'chess',
                nested: {
                    a: 1,
                    b: 1,
                    c: {
                        a: 1
                    }
                }
            }, (err, docId) => {
                const cursor = Collection.find();

                const observeChangesHandle = cursor.observeChanges({
                    changed(docId, doc) {
                        observeChangesHandle.stop();
                        handle.stop();

                        assert.equal(doc.nested.b, 2);
                        assert.equal(doc.nested.c.b, 1);
                        assert.equal(doc.nested.c.a, 1);
                        assert.equal(doc.nested.d, 1);

                        remove({_id: docId}, () => {
                            done();
                        });
                    }
                });

                Tracker.autorun((c) => {
                    if (handle.ready()) {
                        c.stop();

                        update({_id: docId}, {
                            $set: {
                                'nested.c.b': 1,
                                'nested.b': 2,
                                'nested.d': 1
                            }
                        });
                    }
                });
            });
        });

        it('Should not update multiple documents if not specified', function (done) {
            let handle = subscribe({game: 'monopoly'});

            create({game: 'monopoly', title: 'test'}, (err, _id1) => {
                create({game: 'monopoly', title: 'test2'}, (err, _id2) => {
                    const cursor = Collection.find({game: 'monopoly'});

                    let wrongDocChanged = false;
                    const observeChangesHandle = cursor.observeChanges({
                        changed(docId) {
                            if (docId !== _id1) {
                                wrongDocChanged = true
                            }
                        }
                    });

                    Tracker.autorun((c) => {
                        if (!handle.ready()) return;
                        c.stop();
                        update({game: 'monopoly'}, {
                            $set: {score: Math.random()}
                        }, (err, result) => {
                            observeChangesHandle.stop();
                            handle.stop();
                            remove({game: 'monopoly'})
                            done(wrongDocChanged && 'expected only one document change');
                        });
                    });
                })
            })
        });

        it('Should update multiple documents if specified', function (done) {
            let handle = subscribe({game: 'monopoly2'});

            create({game: 'monopoly2', title: 'test'}, (err, _id1) => {
                create({game: 'monopoly2', title: 'test2'}, (err, _id2) => {
                    const cursor = Collection.find({game: 'monopoly2'});

                    let changes = 0;
                    const observeChangesHandle = cursor.observeChanges({
                        changed(docId) {
                            changes += 1
                        }
                    });

                    Tracker.autorun((c) => {
                        if (!handle.ready()) return;
                        c.stop();
                        update({game: 'monopoly2'}, {
                            $set: {score: Math.random()}
                        }, {multi: true}, (err, result) => {
                            observeChangesHandle.stop();
                            handle.stop();
                            remove({game: 'monopoly2'})
                            done(changes !== 2 && 'expected multiple changes');
                        });
                    });
                })
            })
        });

        it('Should detect an update of a non published document', function (done) {
            create({
                game: 'backgammon',
                title: 'test'
            }, (err, _id) => {
                let handle = subscribe({
                    game: 'chess',
                });

                const score = Math.random()

                const cursor = Collection.find();
                const observeChangesHandle = cursor.observeChanges({
                    added(docId, doc) {
                        if (docId !== _id) return;

                        assert.equal(doc.game, 'chess');
                        assert.equal(doc.score, score);
                        assert.equal(doc.title, 'test');

                        observeChangesHandle.stop();
                        handle.stop();
                        remove({_id}, () => {
                            done();
                        });
                    }
                });

                Tracker.autorun((c) => {
                    if (handle.ready()) {
                        c.stop();
                        update({_id}, {$set: {game: 'chess', score}});
                    }
                });
            });
        });

        it('Should detect an update of a nested field when fields is specified', function (done) {
            create({
                "roles": {
                    "_groups": [
                        "company1",
                        "company2",
                        "company3"
                    ],
                    "_main": "company1",
                    "_global": {
                        "roles": [
                            "manage-users",
                            "manage-profiles",
                        ]
                    }
                }
            }, (err, _id) => {
                let handle = subscribe({}, {
                    fields: {roles: 1}
                });

                const cursor = Collection.find();
                const observeChangesHandle = cursor.observeChanges({
                    changed(docId, doc) {
                        assert.equal(docId, _id);
                        handle.stop();
                        observeChangesHandle.stop();
                        done();
                        remove({_id})
                    }
                });

                Tracker.autorun((c) => {
                    if (handle.ready()) {
                        c.stop();
                        update({_id}, {$set: {'roles._main': 'company2'}});
                    }
                });
            });
        });

        it('Should update properly a nested field when a positional parameter is used', function (done) {
            create({
                "bom": [{
                    stockId: 1,
                    quantity: 1
                }, {
                    stockId: 2,
                    quantity: 2,
                }, {
                    stockId: 3,
                    quantity: 3
                }]
            }, (err, _id) => {
                let handle = subscribe({}, {
                    fields: {bom: 1}
                });

                setTimeout(() => {
                    const cursor = Collection.find();
                    const observeChangesHandle = cursor.observeChanges({
                        changed(docId, doc) {
                            assert.equal(docId, _id);
                            doc.bom.forEach(element => {
                                assert.isTrue(_.keys(element).length === 2);
                                if (element.stockId === 1) {
                                    assert.equal(element.quantity, 30);
                                } else {
                                    assert.equal(element.quantity, element.stockId)
                                }
                            });
                            handle.stop();
                            observeChangesHandle.stop();
                            remove({_id});
                            done();
                        }
                    });

                    Tracker.autorun((c) => {
                        if (handle.ready()) {
                            c.stop();
                            update({_id, 'bom.stockId': 1}, {
                                $set: {'bom.$.quantity': 30}
                            });
                        }
                    });
                }, 100)
            });
        });

        // it('Should detect a removal from client side', function (done) {
        //     create({
        //         game: 'chess',
        //         title: 'E'
        //     }, (err, _id) => {
        //         Collection.remove({ _id }, (err) => {
        //           done(err)
        //         });
        //     });
        // });

        it('Should detect an insert from client side', function (done) {
            Collection.insert({
                game: 'backgammon',
                title: 'E'
            }, (err, _id) => {
                if (err) return done(err);
                remove({_id}, done);
            });
        });

        it('Should detect an update from client side', function (done) {
            create({
                game: 'chess',
                title: 'E'
            }, (err, _id) => {
                Collection.update({_id}, {
                    $set: {score: Math.random()}
                }, (e) => {
                    if (e) return done(e);
                    remove({_id}, done);
                });
            });
        });

        it('Should work with $and operators', function (done) {
            create({
                orgid: '1',
                siteIds: ['1', '2'],
                Year: 2017
            }, (err, _id) => {
                let handle = subscribe({
                    $and: [{
                        orgid: '1',
                    }, {
                        siteIds: {$in: ['1']}
                    }, {
                        'Year': {$in: [2017]}
                    }]
                });

                setTimeout(() => {
                    const cursor = Collection.find();
                    let inChangedEvent = false;
                    const observeChangesHandle = cursor.observeChanges({
                        changed(docId, doc) {
                            assert.equal(docId, _id);
                            inChangedEvent = true;
                            // assert.equal(doc.something, 30);
                        },
                        removed(docId) {
                            assert.isTrue(inChangedEvent);
                            assert.equal(docId, _id);

                            handle.stop();
                            observeChangesHandle.stop();
                            done();
                        }
                    });

                    Tracker.autorun((c) => {
                        if (handle.ready()) {
                            c.stop();
                            let object = Collection.findOne(_id);
                            assert.isObject(object);

                            update({_id}, {
                                $set: {'something': 30}
                            }, () => {
                                update({_id}, {
                                    $set: {'Year': 2018}
                                });
                            });
                        }
                    });
                }, 100)
            });
        });

        it('Should work with $and operators - client side', function (done) {
            create({
                orgid: '2',
                siteIds: ['1', '2'],
                Year: 2017
            }, (err, _id) => {
                let handle = subscribe({
                    $and: [{
                        orgid: '2',
                    }, {
                        siteIds: {$in: ['1']}
                    }, {
                        'Year': {$in: [2017]}
                    }]
                });

                setTimeout(() => {
                    const cursor = Collection.find();
                    let inChangedEvent = false;
                    const observeChangesHandle = cursor.observeChanges({
                        changed(docId, doc) {
                            assert.equal(docId, _id);
                            inChangedEvent = true;
                            // assert.equal(doc.something, 30);
                        },
                        removed(docId) {
                            assert.isTrue(inChangedEvent);
                            assert.equal(docId, _id);
                            handle.stop();
                            observeChangesHandle.stop();
                            done();
                        }
                    });

                    Tracker.autorun((c) => {
                        if (handle.ready()) {
                            c.stop();
                            let object = Collection.findOne(_id);
                            assert.isObject(object);

                            Collection.update({_id}, {$set: {'something': 30}});
                            Collection.remove({_id});
                        }
                    });
                }, 100)
            });
        });

        it('Should be able to detect subsequent updates for direct processing with _ids', function (done) {
            create([
                {subsequent_test: true, name: 'John Smith'},
                {subsequent_test: true, name: 'Michael Willow'},
            ], (err, res) => {
                [_id1, _id2] = res;

                let handle = subscribe({_id: {$in: res}}, {
                    fields: {subsequent_test: 1, name: 1}
                });

                const cursor = Collection.find({subsequent_test: true});
                let inFirst = false;
                const observer = cursor.observeChanges({
                    changed(docId, doc) {
                        if (docId == _id1) {
                            inFirst = true;
                            assert.equal('John Smithy', doc.name);
                        }
                        if (docId == _id2) {
                            assert.isTrue(inFirst);
                            assert.equal('Michael Willowy', doc.name);
                            handle.stop();
                            observer.stop();
                            done();
                        }
                    }
                });
                onHandleReady(handle, () => {
                    update(_id1, {
                        $set: {name: 'John Smithy'}
                    }, () => {
                        update(_id2, {
                            $set: {name: 'Michael Willowy'}
                        })
                    })
                });
            })
        })
    });
});
