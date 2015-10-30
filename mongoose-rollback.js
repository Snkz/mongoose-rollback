'use strict';

var RollbackSchema = require('./models/rollback.js');
var buildRollbackMethods = require('./lib/methods.js');
var buildSaveMethods = require('./lib/save.js');
var buildStaticFunctions = require('./lib/statics.js');
var models = {};

function rollback(mongoose) {
    var conn = mongoose;

    return function rollbackPlugin(schema, options) {
        /* SCHEMA CHANGES */
        var collectionName = options.collectionName.toLowerCase() + '_history';
        var Rollback;

        schema.add({
            _version: {
                type: Number,
                default: 0
            }
        });

        // add index on version field
        if (options && options.index) {
            schema.path('_version').index(options.index)
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
}

module.exports = rollback;
