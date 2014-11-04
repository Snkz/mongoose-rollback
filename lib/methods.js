function methods(schema) {
    var RollbackModel = schema.statics.RollbackModel;

    schema.methods.currentVersion = function(callback) {
        var id = this._id;

        RollbackModel.findOne(
                {"_id": id }, 
                {currentVersion: 1, _id: 0}, 
                callback
        ); 
    }

    schema.methods.findVersion = function(version, callback) {
        var id = this._id;

        RollbackModel.findOne({"_id": id }, 
                { "data": { "$elemMatch": { "_version": version } } },   
                function(err, hist) {
                    if (err) { 
                        callback(err, null);
                        return
                    }

                    var prevModel = hist.data[0];
                    if (typeof prevModel === 'undefined') 
                        err = {err: "Model at version" + version + " does not exist"};

                    callback(err, prevModel);
                });
    }

    // Update state to new version with updates from previous version
    schema.methods.rollback = function(version, callback) {
        console.log('ROLLING BACK...');
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

                // undo version change  
                self['_version'] = v; 

                // save changes and callback take care of rest
                self.save(callback);

            }
        );
    }

    // Revert state to previous update, remove new revisions
    schema.methods.revert = function(version, callback) {
        console.log('REVERTING ...');
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
                self['_version'] = version - 1;

                // remove previous revisions
                schema.statics.RollbackModel.update({ "_id": id },
                    { currentVersion: version, 
                      $pull: { "data": { "_version" : { "$gte": version }}}},
                    { multi: true },
                    
                    function(err) {
                    if (err) {
                        console.log(err);
                        return; // couldn't remove array stuff
                    }

                    // save changes and callback take care of rest
                    self.save(callback);

                });
            
            }
        );
    }
}

module.exports = methods;
