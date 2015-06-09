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

    describe('Two Models', function(done) {

        it('Save two independant models without any issue', function(done) {
            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);
                model.name.should.match('Hello');
                model._version.should.be.exactly(0);

                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, model) {
                    if (err) throw (err);

                    model.name.should.match('Hey');
                    model._version.should.be.exactly(1);
                });
            });

            var model2 = new Model({name: 'Hello', data: 'World'});
            model2.save(function(err, model2) {
               if (err) throw (err);
               model2.name.should.match('Hello');
               model2._version.should.be.exactly(0);
            });

            // realbad
            setTimeout(function() {
                done();
            }, 200);
                     
        });

        it('Save the same model twice', function(done) {

            var model = new Model({name: 'Hello', data: 'World'});
            model.save(function(err, model) {
                if (err) throw (err);
                model.name.should.match('Hello');
                model._version.should.be.exactly(0);

                model.name = "Hey";
                model.data = "Yo";

                model.save(function(err, newmodel) {
                    if (err) throw (err);

                });

                model.name = "Booyah";
                model.save(function(err, newmodel) {
                    if (err) throw (err);

                });

                // realbad
                setTimeout(function() {
                    model.history(0, 100, function(err, models) {
                        if (err) throw (err);
                        models.should.have.length(2);
                        done();
                    });
                }, 200);

            });
        });
    });
});
