function methods(schema) {
    var RollbackModel = schema.statics.RollbackModel;

    // Query hist model for cur version
    schema.methods.currentVersion = function(callback) {
        var id = this._id;

        RollbackModel.findOne(
                {"_id": id }, 
                {currentVersion: 1, _id: 0}, 
                callback
        ); 
    }

    // Return the version in data array
    schema.methods.getVersion = function(version, callback) {
        var id = this._id;
        var self = this;

        RollbackModel.findOne({"_id": id }, 
            { "data": { "$elemMatch": { "_version": version } } },   
            function(err, hist) {
                if (err) { 
                    callback(err, null);
                    return
                }


                if(!hist) {
                    callback(err, null);
                    return;
                }

                var prevModel = hist.data[0];
                if (typeof prevModel === 'undefined') { 
                    err = {err: "Model at version " + version + " does not exist"};
                }

                callback(err, prevModel);
            }
        );
    }

    // Return data array in range supplied
    schema.methods.history = function(min, max, callback) {
        var id = this._id;
        var skip = min || 0;
        var limit = max - skip + 1;
        var self = this;

        //XXX: Cuttting based on array index NOT version
        //TODO: Convert version to array range based on specified max stored value
        RollbackModel.findOne({"_id": id }, {"data": 1}, 
            function(err, hist) {
                if (err) { 
                    callback(err, null);
                    return
                }

                // if history model is empty, we will update and return it;
                if (!hist) {
                    // we know what to return, we can update model async
                    if (skip > 0) {
                        callback(err, []);
                        // store model;
                        //console.log('TODO: SAVE OBJ AS VERSION 0');
                        return;
                    }

                    // store model
                    //console.log('TODO: SAVE OBJ AS VERSION 0');
                    callback(err, []);
                }

                var entries = hist.data.length;
                
                // if skip is greater then entries then
                if (entries === 0 || entries < skip) {
                    callback(err, []);
                    return;
                }

                // if max is out of bounds, reset it.
                if (max > entries) {
                    max = entries;
                }

                callback(err, hist.data.slice(skip, max));

            }
        );
    }

    // Update state to new version with updates from previous version
    schema.methods.rollback = function(version, callback) {
        var id = this._id;
        var v = this._version;
        var self = this;

        RollbackModel.findOne({"_id": id }, 
            { "data": { "$elemMatch": { "_version": version } } },   
            function(err, hist) {
                if (err) { 
                    callback(err, null);
                    return
                }

                // update each field in model with old_version
                var prevModel = hist.data[0];
                if (typeof prevModel === 'undefined') {
                    callback({err: "Model at version" 
                        + version + " does not exist"} , null);
                    return;
                }

                Object.keys(prevModel).forEach(function(key) {
                    self[key] = prevModel[key];
                });

                // save changes and callback take care of rest
                self.save(callback);

            }
        );
    }

    // Revert state to previous update, remove new revisions
    schema.methods.revert = function(version, callback) {
        var id = this._id;
        var v = this._version;
        var self = this;

        RollbackModel.findOne({"_id": id }, 
            { "data": { "$elemMatch": { "_version": version } } },   
            function(err, hist) {
                if (err) { 
                    callback(err, null);
                    return
                }

                // update each field in model with old_version
                var prevModel = hist.data[0];
                if (typeof prevModel === 'undefined') {
                    callback({err: "Model at version" 
                        + version + " does not exist"} , null);
                    return;
                }

                // Revert changes to model at v = version 
                Object.keys(prevModel).forEach(function(key) {
                    self[key] = prevModel[key];
                });

                // Decrement version number (changes haven't been recorded yet);
                self['_version'] = version;

                // remove previous revisions
                schema.statics.RollbackModel.update({ "_id": id },
                    { currentVersion: version, 
                      $pull: { "data": { "_version" : { "$gte": version }}}},
                    function(err) {
                    if (err) {
                        callback(err);
                        return; // couldn't remove array stuff
                    }

                    // save changes and callback take care of rest
                    self.save(callback);

                });
            
            }
        );
    }
}

// First entry into history model
function storeAndReturn(model) {
    var id = model._id;
    
    assert(model._version == 0);
    model._version = 0;

    var hist_obj = {
            currentVersion: 0,
            _id: ObjectId(id),
            data: [model.toObject()]
    }

    var histModel = new RollbackModel(hist_obj);
    histModel.save(function(err, hist, numAffected) {
        if (err) {
            throw (err);
        }
        // update version now
        //console.log(hist);
    });
}


module.exports = methods;
