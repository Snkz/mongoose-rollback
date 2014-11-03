var RollbackSchema = require('./models/rollback.js');
var mongoose = require('mongoose');
var Rollback;

function rollbackPlugin (schema, options) {

    // assumes collection name exists/
    //var collectionName = schema.collection.name + "_hist";
    var collectionName = options.collectionName + "_hist";
    console.log(collectionName);
    
    schema.add({ _version: {
            type: Number,
            default: 0
        }
    })

    // avoid recompilation
    if (mongoose.models.Rollback) {
        Rollback = mongoose.model('Rollback');
    } else {
        Rollback = mongoose.model('Rollback', RollbackSchema, collectionName);
    }

    schema.pre('save', function(next) {
        // what happens on err??
        console.log(this._version++);
        next();
    });

    schema.post('save', function(doc) {
        console.log("Just saved doc", doc);
    });
 
    // add index on version field
    if (options && options.index) {
        schema.path('_version').index(options.index)
    } 
}


module.exports = rollbackPlugin;
