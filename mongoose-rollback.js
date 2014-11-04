var RollbackSchema = require('./models/rollback.js');
var mongoose = require('mongoose');
var buildRollbackMethods = require('./lib/methods.js');
var buildSaveMethods = require('./lib/save.js');

function rollbackPlugin (schema, options) {

    /* SCHEMA CHANGES */
    var collectionName = options.collectionName + "_hist";
    var Rollback;

    schema.add({ _version: {
            type: Number,
            default: -1
        }
    })

    // avoid recompilation
    if (mongoose.models.Rollback) {
        Rollback = mongoose.model('Rollback');
    } else {
        Rollback = mongoose.model('Rollback', RollbackSchema, collectionName);
    }


    // add index on version field
    if (options && options.index) {
        schema.path('_version').index(options.index)
    } 
 
    schema.statics.RollbackModel = Rollback;

    /* STORAGE METHODS (happen transparently)*/
    buildSaveMethods(schema);

    /* DOCUMENT METHODS (happen on instances of a model)*/
    buildRollbackMethods(schema);

}

module.exports = rollbackPlugin;
