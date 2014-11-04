var utils = require('./utils.js');
var assert = require('assert');
var ObjectId = require('mongoose').Types.ObjectId;

function save(schema) {
    var RollbackModel = schema.statics.RollbackModel;

    function storeModel(model, done) {
        var v = model._version;
        var id = model._id;
        
        // find and update existing Document 
        RollbackModel.find({"_id": id}).exec(function(err, hists) {
            if (err) { 
                console.log(err);
                done();
                return;
            }

            if(!utils.isOnlyDocument(hists)) {    
                // nothing found, create new document 
                assert(v === 0);
                storeNewModel(model, done);
                return;
            }   

            // update existing model
            var histModel = hists[0];
            histModel.currentVersion = v;
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
                currentVersion: v,
                _id: ObjectId(id),
                data: [model]
        }

        var histModel = new RollbackModel(hist_obj);
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
}

module.exports = save;
