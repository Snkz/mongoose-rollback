/* Utility functions */

module.exports = (function() {
    this.models = {}; // Keeping track of what I've returned so far
    this.isOnlyDocument = function(docs) {
        if (docs !== null && docs.length == 1) {
            return true;
        }
        return false;
    }

    // First entry into history model
    this.storeAsync = function(model, RollbackModel, type, callback) {
        var id = model._id;
        
        var hist_obj = {
                currentVersion: 0,
                _id: id,
                data: [model.toObject()]
        }
    
        var histModel = new RollbackModel(hist_obj);
        histModel.save(function(err, hist, numAffected) {
            if (err) {
                callback(err, null);
            }

            // TODO: refactor this func
            if (type === 'Array')
                callback(err, [model.toObject()]);

            if (type === 'Object')
                callback(err, model.toObject());

            if (type === 'History')
                callback(err, hist.data);
        });
    }

    this.getRollbackModel = function(model, schema, options) {
        var conn;
        if (options && options.conn) {
            conn = mongoose.connect(options.conn);
        } else {
            conn = model.constructor.collection.conn; 
        }

        var collection;
        if (options && options.collectionName) {
            collection = options.collectionName;
        } else {
            collection = model.constructor.collection.name;
        }


        var modelName = model.constructor.modelName;
        var rollbackName = 'Rollback_'+modelName;
        console.log(modelName);
        console.log(collection);

        if (!models[rollbackName]) {
            models[rollbackName] = conn.model(rollbackName, 
                    RollbackSchema, collectionName);

            schema.statics.RollbackModel = models[rollbackName];
        }

        return models[rollbackName];

    }

    return this;
})();




