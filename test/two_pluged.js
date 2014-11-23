var assert = require('assert');
var should = require('should');
var mongoose = require('mongoose');
var Model = require('../models/model.js').Model;
var Model2 = require('../models/model2.js').Model2;

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
                  Model2.find({}).remove(function(err, result) {
                      if (err) throw (err);
                      var history = Model2.collection.name + "_hist";
                      mongoose.connection.collections[history].remove({}, function(err, result) {
                      if (err) throw (err);   
                          done();
                      });
                  });
            });
        });
    });

    describe('Double Jepordy', function(done) {

        it('should retrieve CURRENT version for both models', function(done) {
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

                        var model2 = new Model2({type: 'Hello', data: 'World'});
                        model2.save(function(err, model2) {
                            if (err) throw (err);

                            model2.should.have.property('_version');
                            model2._version.should.be.exactly(0);
                            model2.type = "Hey";
                            model2.data = "Yo";

                            model2.save(function(err, model2) {
                                if (err) throw (err);

                                model2.should.have.property('_version');
                                model2._version.should.be.exactly(1);

                                model2.getVersion(1, function(err, hist) {
                                    if (err) throw (err);

                                    hist._id.should.match(model2._id);
                                    hist._version.should.equal(1);
                                    hist.type.should.match("Hey");
                                    done();
                                });
                            });
                        });
                    });
                });
            });

        });

        it('should retrieve older version for both models', function(done) {
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

                        var model2 = new Model2({type: 'Hello', data: 'World'});
                        model2.save(function(err, model2) {
                            if (err) throw (err);

                            model2.should.have.property('_version');
                            model2._version.should.be.exactly(0);
                            model2.type = "Hey";
                            model2.data = "Yo";

                            model2.save(function(err, model2) {
                                if (err) throw (err);

                                model2.should.have.property('_version');
                                model2._version.should.be.exactly(1);

                                model2.getVersion(0, function(err, hist) {
                                    if (err) throw (err);

                                    hist._id.should.match(model2._id);
                                    hist._version.should.equal(0);
                                    hist.type.should.match("Hello");
                                    done();
                                });
                            });
                        });
            
                    });
                });
            });
            
        });

        it('should FAIL to retrive newer version for both models', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);

                model.getVersion(5, function(err, hist) {
                    err.should.be.ok;
                    assert(hist === null);
                    var model2 = new Model2({type: 'Hello', data: 'World'});
                    model2.save(function(err, model2) {
                        if (err) throw (err);

                        model2.getVersion(5, function(err, hist) {
                            err.should.be.ok;
                            assert(hist === null);
                            done();
                        });
                        
                    });
            

                });
                
            });
            
        });

        it('should asyncly get version for both models', function(done) {
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

                                    Model2.collection.insert({type: 'UNIQUE', data: 'World'}, function(err, model2) {
                                        if (err) throw (err);

                                        Model2.findOne({'type': 'UNIQUE'}, function(err, model2) {
                                            model2._version.should.match(0);
                                            model2.currentVersion(function(err, ver) {
                                                assert(ver === null);
                                                model2.getVersion(0, function(err, hist) {
                                                    if (err) throw (err);
                                                    hist.type.should.match('UNIQUE');
                                                    hist._version.should.equal(0);

                                                    // confirm nothing got borked
                                                    model2.getVersion(0, function(err, hist) {

                                                        if (err) throw (err);
                                                        hist.type.should.match('UNIQUE');
                                                        hist._version.should.equal(0);

                                                        model2.type = 'Hey';
                                                        model2.save(function(err, saved_model2) {
                                                            saved_model2.type.should.match('Hey');
                                                            saved_model2._version.should.equal(1);
                                                            done();
                                                        });
                                                    });

                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            
        });
    });
});

