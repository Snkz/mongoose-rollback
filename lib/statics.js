var utils = require('./utils.js');
function statics(schema) {

    // Eliminate all hist models
    schema.statics.wipeHistory = function(callback) {
        var RollbackModel = this.RollbackModel;
        RollbackModel.find({}).remove(callback);
    }

    // for models that have been inserted outside of mongoose's save methods
    // but for w/e reason, you'd still like have their original version in 
    // history. This will save it without updating the version number;
    schema.statics.initHistory = function(id, callback) {

        var RollbackModel = this.RollbackModel;

        this.findOne({'_id': id}, function(err, model) {
            if (err) {
                return callback(err, null);
            }

            RollbackModel.findOne({'_id' : id}, function(err, rollback) {
                if (err) {
                    return callback(err, null)
                }

                if (rollback) {
                    err =  new Error("Model already has history");
                    callback(err, null);
                    return;
                } 

                if (model._version !== 0) {
                    err =  new Error("Model already has history (but no versions?)");
                    callback(err, null);
                    return;
                }  

                utils.storeAsync(model, RollbackModel, 'History', callback);
            });
        });
    }
};

        

module.exports = statics;
