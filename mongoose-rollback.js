var RollbackSchema = require('./models/rollback.js');
var mongoose = require('mongoose');
var ObjectId = require('mongoose').Types.ObjectId;
var assert = require('assert');

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

    schema.statics.RollbackModel = Rollback;

    // add index on version field
    if (options && options.index) {
        schema.path('_version').index(options.index)
    } 


    /* PRE SAVE FUNCTIONS */
    function storeModel(model, done) {
        var v = model._version;
        var id = model._id;
        
        // find and update existing Document 
        Rollback.find({"_id": id}).exec(function(err, hists) {
            if (err) { 
                console.log(err);
                done();
                return;
            }

            if(!isOnlyDocument(hists)) {    
                // nothing found, create new document 
                assert(v === 0);
                storeNewModel(model, done);
                return;
            }   

            // update existing model
            var histModel = hists[0];
            histModel.current_version = v;
            assert(histModel.data.length === v); // XXX: Will need to be removed
            histModel.data.push(model);
            histModel.save(function(err, hist, numAffected) {
            
                if (err) {
                    console.log(err);
                }

                console.log("UPDATE MODEL AT %d", v, id);

                done()
            });
        });
    }

    // First entry into history model
    function storeNewModel(model, done) {
        var v = model._version;
        var id = model._id;
        
        var hist_obj = {
                current_version: v,
                _id: ObjectId(id),
                data: [model]
        }

        var histModel = new Rollback(hist_obj);
        histModel.save(function(err, hist, numAffected) {
            if (err) {
                console.log(err);
            }

            console.log("CREATED MODEL AT %d", v, id);
            done()
        });
    }

    schema.pre('save', true, function(next, done) {
        // doesn't get called on validation failures
        this._version++
        next();
        storeModel(this, done);
    });

    schema.post('save', function(doc) {
        console.log("Just saved ORIGNAL doc!");
        console.log(doc._id, doc._version);
    });
 
    /* DOCUMENT METHODS */
    schema.methods.findVersion = function(version, callback) {
        var id = this._id;
        Rollback.findOne({"_id": id }, 
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
        var id = this._id;
        var v = this._version;
        var self = this;

        Rollback.findOne({"_id": id }, 
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
        var id = this._id;
        var v = this._version;
        var self = this;

        Rollback.findOne({"_id": id }, 
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
                    self['_version'] = version - 1; // will be incremented in save so;
                    self.save(function(err, model) {
                        if (err) {
                            callback(err);
                            return; // could not revert
                        }

                        // remove previous revisions
                        Rollback.update({ "_id": id },
                            { current_version: version, 
                              $pull: { "data": { "_version" : { "$gt": version } } } },
                            { multi: true },
                            
                            function(err, hist) {
                            if (err) {
                                console.log(err);
                                return; // couldn't remove array stuff
                            }

                            console.log("CLEANED UP TO VERSION %d", version);
                            console.log(hist);
                        });

                        callback(null);

                    });

                }
        );
    }
}

/* UTILS */
function isOnlyDocument(docs) {
    if (docs !== null && docs.length == 1) {
        return true;
    }
    return false;
}



module.exports = rollbackPlugin;
