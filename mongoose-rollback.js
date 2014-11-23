var RollbackSchema = require('./models/rollback.js');
var buildRollbackMethods = require('./lib/methods.js');
var buildSaveMethods = require('./lib/save.js');
var buildStaticFunctions = require('./lib/statics.js');
var models = {};
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
    var mongoose = require('mongoose');
    var conn = mongoose;

    // add index on version field
    if (options && options.index) {
        schema.path('_version').index(options.index)
    } 

    // get connection
    if (options && options.conn) {
        var conn = mongoose.connect(options.conn);
    } 

    // avoid recompilation
    if (models[collectionName]) {
        Rollback = models[collectionName];
    } else {
        models[collectionName] = conn.model(collectionName, RollbackSchema, collectionName);
        Rollback = models[collectionName];
    }

    schema.statics.RollbackModel = Rollback;

    /* STORAGE METHODS (happen transparently) */
    buildSaveMethods(schema, options);

    /* DOCUMENT METHODS (happen on instances of a model)*/
    buildRollbackMethods(schema, options);

    /* SCHEMA FUNCTIONS (statics altering collection */
    buildStaticFunctions(schema, options);

}

module.exports = rollbackPlugin;
