var assert = require('assert');
var should = require('should');
var mongoose = require('mongoose');
var Model = require('../models/model.js').Model;

describe('Mongoose Rollback Machine', function(done) {
    console.log('Testing basic functionailty, the standard use case.');
    before(function(done) {
        mongoose.connect('mongodb://localhost/test', {});
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection err:'));
        db.once('open', function() {
            //console.log('Connected to Mongo DB at ' + db.host + ":" + db.port);
        });

        done();
    });

    after(function(done) {
        mongoose.disconnect();
        done();
    });

    beforeEach(function(done) {
        Model.find({}).remove(function(err, result) {
            if (err) throw (err);
            var history = Model.collection.name + "_hist";
            mongoose.connection.collections[history].remove({}, function(err, result) {
                if (err) throw (err);   
                    done();
            });
        });
    });

    describe('Version number', function(done) {
        it('should add a version number field to the object', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.should.have.property('_version');
                model._version.should.be.exactly(0);
                done();
            });
            
        });

        it('should NOT increment version number field', function(done) {
            var model = new Model({data: 'World'});
            model.save(function(err, saved_model) {

                err.should.be.ok;
                assert(typeof saved_model === 'undefined');

                model.should.have.property('_version');
                model._version.should.be.exactly(0);
                done();

            });
            
        });

        it('should increment version on SUCCESFUL updates', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.should.have.property('_version');
                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.should.have.property('_version');
                    model._version.should.be.exactly(1);

                    model.name = "Hi";
                    model.data = "Boss";

                    model.save(function(err, model) {
                        if (err) throw (err);

                        model.should.have.property('_version');
                        model._version.should.be.exactly(2);

                        done();
                    });
                });
            });
            
        });

        it('should increment ONLY on SUCCESFUL updates', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.should.have.property('_version');
                model._version.should.be.exactly(0);
                

                model.name = undefined;

                model.save(function(err, saved_model) {

                    err.should.be.ok;
                    assert(typeof saved_model === 'undefined');
                    model.should.have.property('_version');
                    model._version.should.be.exactly(0);

                    model.name = "Hi";
                    model.data = "Boss";

                    model.save(function(err, model) {
                        if (err) throw (err);

                        model.should.have.property('_version');
                        model._version.should.be.exactly(1);

                        done();
                    });
                });
            });
            
        });
    });

    describe('Version Hell', function(done) {

        it('should retrieve CURRENT version', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.should.have.property('_version');
                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.should.have.property('_version');
                    model._version.should.be.exactly(1);

                    model.getVersion(1, function(err, hist) {
                        if (err) throw (err);

                        hist._id.should.match(model._id);
                        hist._version.should.equal(1);
                        hist.name.should.match("Hey");
                        done();
                    });
                });
            });

        });

        it('should retrieve older version', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.should.have.property('_version');
                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.should.have.property('_version');
                    model._version.should.be.exactly(1);

                    model.getVersion(0, function(err, hist) {
                        if (err) throw (err);

                        hist._id.should.match(model._id);
                        hist._version.should.equal(0);
                        hist.name.should.match("Hello");
                        done();
                    });
                });
            });
            
        });

        it('should FAIL to retrive newer version', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.getVersion(5, function(err, hist) {
                    err.should.be.ok;
                    assert(hist === null);
                    done();
                });
                
            });
            
        });

        it('should asyncly get version!', function(done) {
            Model.collection.insert({name: 'UNIQUE', data: 'World'}, function(err, model) {
                if (err) throw (err);

                Model.findOne({'name': 'UNIQUE'}, function(err, model) {
                    model._version.should.match(0);
                    model.currentVersion(function(err, ver) {
                        assert(ver === null);
                        model.getVersion(0, function(err, hist) {
                            if (err) throw (err);
                            hist.name.should.match('UNIQUE');
                            hist._version.should.equal(0);

                            // confirm nothing got borked
                            model.getVersion(0, function(err, hist) {

                                if (err) throw (err);
                                hist.name.should.match('UNIQUE');
                                hist._version.should.equal(0);

                                model.name = 'Hey';
                                model.save(function(err, saved_model) {
                                    saved_model.name.should.match('Hey');
                                    saved_model._version.should.equal(1);
                                    done();
                                });
                            });

                        });
                    });
                });
            });
            
        });
    });

    describe('Current version #', function(done) {

        it('should retrieve CURRENT version NUMBER', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);


                    model.currentVersion(function(err, version) {
                        if (err) throw (err);
                        version.currentVersion.should.match(1);
                        done();
                    });
                });
            });

        });

        it('should retrieve CURRENT version NUMBER after ONE save', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.currentVersion(function(err, version) {
                    if (err) throw (err);
                    version.currentVersion.should.match(0);
                    done();
                });
            });
        });

        it('should FAIL to get currentVersion number', function(done) {
            Model.collection.insert({name: 'Hello', data: 'World'}, function(err, model) {
                if (err) throw (err);

                var model = new Model(model[0]);
                model.currentVersion(function(err, hist) {
                    if (err) throw (err);
                    assert(hist === null);
                    done();

                });
                
            });
            
        });
    });

    describe('History of history', function(done) {

        it('should retrieve history', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.name = "Hey";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.history(0, 2, function(err, hist) {
                        if (err) throw (err);

                        hist.should.have.length(2);
                        done();
                    });
                });
            });

        });

        it('should retrieve ONLY FIRST item in history', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.history(0, 1, function(err, hist) {
                        if (err) throw (err);

                        hist.should.have.length(1);
                        hist[0].name.should.match('Hello');
                        done();
                    });
                });
            });
            
        });
        
        it('should retrieve ONLY LAST item in history', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.history(1, 10, function(err, hist) {
                        if (err) throw (err);

                        hist.should.have.length(1);
                        hist[0].name.should.match('Hey');
                        done();
                    });
                });
            });
            
        });

        it('should FAIL to retrive history', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.history(5, 5, function(err, hist) {
                    hist.should.have.length(0);
                    done();
                });
                
            });
        });

        it('should asyncly build history!', function(done) {
            Model.collection.insert({name: 'UNIQUE', data: 'World'}, function(err, model) {
                if (err) throw (err);

                Model.findOne({'name': 'UNIQUE'}, function(err, model) {
                    model._version.should.match(0);
                    model.currentVersion(function(err, ver) {
                        assert(ver === null);
                        model.history(0, 100, function(err, hist) {
                            if (err) throw (err);
                            var hist = hist[0];
                            hist.name.should.match('UNIQUE');
                            hist._version.should.equal(0);

                            // confirm nothing got borked
                            model.history(0, 100, function(err, hist) {

                                if (err) throw (err);
                                var hist = hist[0];
                                hist.name.should.match('UNIQUE');
                                hist._version.should.equal(0);

                                model.name = 'Hey';
                                model.save(function(err, saved_model) {
                                    saved_model.name.should.match('Hey');
                                    saved_model._version.should.equal(1);
                                    done();
                                });
                            });

                        });
                    });
                });
            });
            
        });
    });

    describe('Rollback Hell', function(done) {

        it('should rollback to PREVIOUS version', function(done) {
            var name = 'Hello';
            var data = 'World';
            var model = new Model({name: name, data: data});
            model.save(function(err, model) {
                if (err) throw (err);

                model.should.have.property('_version');
                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.should.have.property('_version');
                    model._version.should.be.exactly(1);

                    model.rollback(0, function(err, hist) {
                        if (err) throw (err);
                        hist.name.should.match(name);
                        hist.data.should.match(data);
                        hist._version.should.equal(2);
                        
                        model.name.should.match(name);
                        model.data.should.match(data);
                        model._version.should.equal(2);
                        done();
                    });
                });
            });
            
        });

        it('should rollback to FIRST version', function(done) {
            var name = 'Hello';
            var data = 'World';
            var model = new Model({name: name, data: data});
            model.save(function(err, model) {
                if (err) throw (err);

                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model._version.should.be.exactly(1);


                    model.name = "BOO";
                    model.data = "GHOST";

                    model.save(function(err, model) {

                        model._version.should.be.exactly(2);

                        model.rollback(0, function(err, hist) {
                            if (err) throw (err);
                            hist.name.should.match(name);
                            hist.data.should.match(data);
                            hist._version.should.equal(3);

                            model.name.should.match(name);
                            model.data.should.match(data);
                            model._version.should.equal(3);
                            done();
                        });
                    });
                });
            });
            
        });

        it('should rollback to FIRST version then update fine', function(done) {
            var model = new Model({name: 'hello', data: 'world'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.name = "BOO";
                    model.data = "GHOST";

                    model.save(function(err, model) {

                        model._version.should.be.exactly(2);

                        model.rollback(0, function(err, hist) {
                            if (err) throw (err);

                            model.name = "guili";
                            model.data = "ble";

                            model.save(function(err, model) {
                                if (err) throw (err);

                                model._version.should.be.exactly(4);
                                model.name.should.match('guili');
                                model.data.should.match('ble');
                                done();
                            });
                        });
                    });
                });
            });
            
        });

        it('should FAIL to rollback to newer version', function(done) {
            var model = new Model({name: "hello", data: "world"});
            model.save(function(err, model) {
                if (err) throw (err);

                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model._version.should.be.exactly(1);

                    model.rollback(5, function(err, hist) {
                        err.should.be.ok;
                        assert(hist === null);
                        done();
                    });
                });
            });
            
        });

        it('should FAIL to rollback to newer version but update fine after', function(done) {
            var model = new Model({name: "hello", data: "world"});
            model.save(function(err, model) {
                if (err) throw (err);

                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model._version.should.be.exactly(1);

                    model.rollback(5, function(err, hist) {
                        err.should.be.ok;
                        assert(hist === null);

                        model.name = 'Bro';

                        model.save(function(err, model) {
                            model.name.should.match('Bro');
                            model._version.should.be.exactly(2);
                            done();
                        });
                    });
                });
            });
            
        });
    });

    describe('Revert Hell', function(done) {

        it('should revert to PREVIOUS version', function(done) {
            var name = 'Hello';
            var data = 'World';
            var model = new Model({name: name, data: data});
            model.save(function(err, model) {
                if (err) throw (err);

                model.should.have.property('_version');
                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.should.have.property('_version');
                    model._version.should.be.exactly(1);

                    model.revert(0, function(err, hist) {
                        if (err) throw (err);
                        // hist is output of save
                        hist.name.should.match(name);
                        hist.data.should.match(data);
                        hist._version.should.equal(0);
                        
                        // model == hist on success 
                        model.name.should.match(name);
                        model.data.should.match(data);
                        model._version.should.equal(0);
                        done();
                    });
                });
            });
            
        });

        it('should revert to the FIRST version', function(done) {
            var name = 'Hello';
            var data = 'World';
            var model = new Model({name: name, data: data});
            model.save(function(err, model) {
                if (err) throw (err);

                model.should.have.property('_version');
                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.should.have.property('_version');
                    model._version.should.be.exactly(1);

                    model.revert(0, function(err, hist) {
                        if (err) throw (err);
                        hist.name.should.match(name);
                        hist.data.should.match(data);
                        hist._version.should.equal(0);
                        
                        model.name.should.match(name);
                        model.data.should.match(data);
                        model._version.should.equal(0);
                        done();
                    });
                });
            });
            
        });

        it('should revert to FIRST version then update fine', function(done) {
            var model = new Model({name: 'hello', data: 'world'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.name = "BOO";
                    model.data = "GHOST";

                    model.save(function(err, model) {

                        model._version.should.be.exactly(2);

                        model.revert(0, function(err, hist) {
                            if (err) throw (err);

                            model.name = "guili";
                            model.data = "ble";

                            model.save(function(err, model) {
                                if (err) throw (err);

                                model._version.should.be.exactly(1);
                                model.name.should.match('guili');
                                model.data.should.match('ble');
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should FAIL to revert to newer version', function(done) {
            var model = new Model({name: "hello", data: "world"});
            model.save(function(err, model) {
                if (err) throw (err);

                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model._version.should.be.exactly(1);

                    model.revert(5, function(err, hist) {
                        err.should.be.ok;
                        assert(hist === null);
                        done();
                    });
                });
            });
            
        });

        it('should FAIL to revert to newer version but update fine after', function(done) {
            var model = new Model({name: "hello", data: "world"});
            model.save(function(err, model) {
                if (err) throw (err);

                model._version.should.be.exactly(0);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model._version.should.be.exactly(1);

                    model.revert(5, function(err, hist) {
                        err.should.be.ok;
                        assert(hist === null);

                        model.name = 'Bro';

                        model.save(function(err, model) {
                            model.name.should.match('Bro');
                            model._version.should.be.exactly(2);
                            done();
                        });
                    });
                });
            });
            
        });

    });
});

