// Model for testing purposes only
var mongoose = require('mongoose');
var rollback = require('../mongoose-rollback');

var Schema = mongoose.Schema;
var Model2Schema = new Schema({
    type: {
        type: String,
        required: true
        },

    createdAt: {
        type: Date,
        default: Date.now
        },
    
    data: {
        type: String
        }
    },
    { 
        id: false 
    } // remove mongoose virt field

);

Model2Schema.plugin(rollback, {
    index: true, 
    //conn: 'mongodb://localhost/test', required if connection isn't explict
    collectionName: 'model2_collection' 
});

var Model2;

if (mongoose.models.Model2) {
    Model2 = mongoose.model('Model2');
} else {
    Model2 = mongoose.model('Model2', Model2Schema, 'model2_collection');
}

exports.Model2 = Model2;
