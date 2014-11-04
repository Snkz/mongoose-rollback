var mongoose = require('mongoose');
var Document = mongoose.Document;

var Schema = mongoose.Schema;
var collectionName = '_history';
var Anything = mongoose.Schema.Types.Mixed;

var RollbackSchema = new Schema({
    data: {
        //XXX: Consider making this a sub document
        type: [Anything],
        required: true,
    },

    currentVersion: {
        type: Number,
        required: true,
        index: true
    }

});



module.exports = RollbackSchema;
