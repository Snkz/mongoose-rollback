var assert = require('assert');
var request = require('supertest');
var should = require('should');
var _ = require('lodash');
var Model = require('../models/model.js');

describe('Mongoose Rollback Machine', function(done) {
    before(function(done) {
        var model = new Model({name: 'Hello', data: 'World'});
    });
});

