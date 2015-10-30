'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Anything = mongoose.Schema.Types.Mixed;

var RollbackSchema = new Schema({
    data: {
        //XXX: Consider making this a sub document
        type: [Anything],
        required: true
    },

    currentVersion: {
        type: Number,
        required: true,
        index: true
    }

});


module.exports = RollbackSchema;
