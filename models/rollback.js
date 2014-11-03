var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var collectionName = '_history';
var Anything = mongoose.Schema.Types.Mixed;

var RollbackSchema = new Schema({
    data: {
        type: Anything,
        required: true
    },
    version: {
        type: Number,
        index: true,
        required: true
    }

    // _id field is implicit, will always create using og models _id
});

module.exports = RollbackSchema;
