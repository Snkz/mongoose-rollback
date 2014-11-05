function statics(schema) {

    // Eliminate all hist models
    schema.statics.wipeHistory = function(callback) {
        var RollbackModel = this.RollbackModel;
        RollbackModel.find({}).remove(callback);
    }
}

module.exports = statics;
