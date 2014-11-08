/* Utility functions */

module.exports = (function() {
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



    return this;
})();




