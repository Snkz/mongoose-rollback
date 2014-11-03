var RollbackSchema = require('./models/rollback.js');
var mongoose = require('mongoose');
var ObjectId = require('mongoose').Types.ObjectId;
var assert = require('assert');

function rollbackPlugin (schema, options) {

    // assumes collection name exists/
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

    function isOnlyDocument(docs) {
        if (docs !== null && docs.length == 1) {
            return true;
        }
        return false;
    }

    function storeModel(model, done) {
        var v = model._version;
        var id = model._id;
        
        // Should be unneccasary
        Rollback.find({"_id": id}).exec(function(err, hists) {
            if (err) { 
                console.log(err);
                done();
                return;
            }

            if(!isOnlyDocument(hists)) {    
                // nothing found, create new model 
                assert(v === 0);
                storeNewModel(model, done);
                return;
            }   

            // update exist model
            var histModel = hists[0];
            histModel.current_version = v;
            assert(histModel.data.length === v); // XXX: Will need to be removed
            histModel.data.push(model);
            histModel.save(function(err, hist, numAffected) {
            
                if (err) {
                    console.log(err);
                }

                console.log("UPDATE MODEL AT %d", v);

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

            done()
        });
    }

    schema.pre('save', true, function(next, done) {
        // what happens on err??
        this._version++
        next();
        storeModel(this, done);
    });

    schema.post('save', function(doc) {
        console.log("Just saved ORIGNAL doc!");
        console.log(doc);
    });
 
    // add index on version field
    if (options && options.index) {
        schema.path('_version').index(options.index)
    } 
}


module.exports = rollbackPlugin;
