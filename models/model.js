// Model for testing purposes only
var mongoose = require('mongoose');
var rollback = require('../mongoose-rollback');

var Schema = mongoose.Schema;
var ModelSchema = new Schema({
    name: {
        type: String
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

ModelSchema.plugin(rollback, {index: true, collectionName: 'model_collection'});

var Model;

if (mongoose.models.Model) {
    Model = mongoose.model('Model');
} else {
    Model = mongoose.model('Model', ModelSchema, 'model_collection');
}

exports.Model = Model;
