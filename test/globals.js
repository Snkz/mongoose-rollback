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
                                wiped.should.match(hists.length);
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
                    wiped.should.match(hists.length);
                    done();
                });
            });
        });
    });
});
