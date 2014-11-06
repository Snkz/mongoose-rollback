var RollbackSchema = require('./models/rollback.js');
var mongoose = require('mongoose');
var buildRollbackMethods = require('./lib/methods.js');
var buildSaveMethods = require('./lib/save.js');
var buildStaticFunctions = require('./lib/statics.js');

function rollbackPlugin (schema, options) {

    /* SCHEMA CHANGES */
    var collectionName = options.collectionName + "_hist";
    var Rollback;

    schema.add({ _version: {
            type: Number,
            default: 0
        }
    })

    // assumes connection happens before plugin or something? not sure but yea..
    var conn = mongoose; // default connection in mongoose object;

    // add index on version field
    if (options && options.index) {
        schema.path('_version').index(options.index)
    } 

    // get connection
    if (options && options.conn) {
        var conn = mongoose.connect(options.conn);
    } 

    // avoid recompilation
    if (mongoose.models.Rollback) {
        Rollback = conn.model('Rollback');
    } else {
        Rollback = conn.model('Rollback', RollbackSchema, collectionName);
    }

    schema.statics.RollbackModel = Rollback;

    /* STORAGE METHODS (happen transparently) */
    buildSaveMethods(schema);

    /* DOCUMENT METHODS (happen on instances of a model)*/
    buildRollbackMethods(schema);

    /* SCHEMA FUNCTIONS (statics altering collection */
    buildStaticFunctions(schema);

}

module.exports = rollbackPlugin;
