var assert = require('assert');
var request = require('supertest');
var should = require('should');
var mongoose = require('mongoose');
var _ = require('lodash');
var Model = require('../models/model.js').Model;

describe('Mongoose Rollback Machine', function(done) {
    before(function(done) {
        mongoose.connect('mongodb://localhost/test', {});
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection err:'));
        db.once('open', function() {
            console.log('Connected to Mongo DB at ' + db.host + ":" + db.port);
        });

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
                model._version.should.be.exactly(-1);
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

        it('should increment ONLY on succesful updates', function(done) {
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

    describe('Version Value', function(done) {

        it('should retrieve current version', function(done) {
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

                    model.findVersion(1, function(err, hist) {
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

                    model.findVersion(0, function(err, hist) {
                        if (err) throw (err);

                        hist._id.should.match(model._id);
                        hist._version.should.equal(0);
                        hist.name.should.match("Hello");
                        done();
                    });
                });
            });
            
        });

        it('should fail to retrive newer version', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.findVersion(5, function(err, hist) {
                    err.should.be.ok;
                    assert(typeof hist === 'undefined');
                    done();
                });
                
            });
            
        });
    });

    describe('Rollback Hell', function(done) {

        it('should rollback to previous version', function(done) {
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

        it('should rollback to first version', function(done) {
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
    });
});

