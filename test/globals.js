var assert = require('assert');
var should = require('should');
var mongoose = require('mongoose');
var Model = require('../models/model.js').Model;

describe('Mongoose Rollback Machine', function(done) {
    console.log('Testing global functionailty, things that alter state everywhere.');
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

    describe('History wipe', function(done) {

        it('should remove ALL rollback documents', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);
                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    var model2 = new Model({name: 'Hello', data: 'World'});
                    model2.save(function(err, model2) {
                        if (err) throw (err);
                        Model.RollbackModel.find({}, function(err, hists) {
                            if(err) throw (err);
                            hists.should.have.length(2);
                            Model.wipeHistory(function(err, wiped) {
                                wiped.result.n.should.match(hists.length);
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should remove NO rollback documents', function(done) {
            Model.RollbackModel.find({}, function(err, hists) {
                if(err) throw (err);
                hists.should.have.length(0);
                Model.wipeHistory(function(err, wiped) {
                    wiped.result.n.should.match(hists.length);
                    done();
                });
            });
        });
    });

    describe('That time after time passed', function(done) {

        it('Should update history for existing model!', function(done) {
            Model.collection.insert({name: 'UNIQUE', data: 'World'}, function(err, model) {
                if (err) throw (err);

                Model.findOne({'name': 'UNIQUE'}, function(err, model) {
                    model._version.should.match(0);
                    var id = model._id;
                    model.currentVersion(function(err, ver) {
                        assert(ver === null);
                        Model.initHistory(id, function(err, hist) {
                            if (err) throw (err);
                            hist.should.have.length(1);
                            var hist = hist[0];
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

        it('Should FAIL to update history for existing model with history!', function(done) {

            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);
                var id = model._id;
                Model.initHistory(id, function(err, hist) {
                    err.should.be.ok;
                    assert(hist === null);

                    // confirm nothing got borked 
                    model.getVersion(0, function(err, hist) {
                        if (err) throw (err);
                        hist.name.should.match('Hello');
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
