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
            console.log('Connected to Mongo db');
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
});

