var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var collectionName = '_history';
var Anything = mongoose.Schema.Types.Mixed;

var RollbackSchema = new Schema({
    data: {
        //XXX: Consider making this a sub document
        type: [Anything],
        required: true
    },

    current_version: {
        type: Number,
        index: true,
        required: true
    }

});

module.exports = RollbackSchema;
