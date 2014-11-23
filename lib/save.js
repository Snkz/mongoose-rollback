var utils = require('./utils.js');
var assert = require('assert');
var ObjectId = require('mongoose').Types.ObjectId;

function save(schema, options) {
    var RollbackModel = schema.statics.RollbackModel;

    function storeModel(model, done) {
        var v = model._version;
        var id = model._id;
        
        // find and update existing Document 
        RollbackModel.find({"_id": id}).exec(function(err, hists) {
            if (err) { 
                done(err);
                return;
            }

            if(!utils.isOnlyDocument(hists)) {    
                // nothing found, create new document 
                storeNewModel(model, done);
                return;
            }   

            var histModel = hists[0];

            // update version now before push
            model._version = histModel.data.length;

            // update existing model
            histModel.currentVersion = model._version;
            histModel.data.set(histModel.currentVersion, model.toObject());
            histModel.save(function(err, hist, numAffected) {
                if (err) {
                    // undo changes
                    model._version = v;
                    done(err);
                }

                done();
            });
        });
    }

    // First entry into history model
    function storeNewModel(model, done) {
        var id = model._id;
        var v = model._version;
        
        model._version = 0;

        var hist_obj = {
                currentVersion: 0,
                //_id: ObjectId(id),
                _id: id,
                data: [model.toObject()]
        }

        var histModel = new RollbackModel(hist_obj);
        histModel.save(function(err, hist, numAffected) {
            if (err) {
                model._version = v;
                done(err);
            }

            // update version now
            done();
        });
    }

    schema.pre('save', true, function(next, done) {
        next();
        storeModel(this, done);
    });

    schema.pre('update', true, function(next, done) {
        next();
        storeModel(this, done);
    });
    // cascade on delete
    schema.pre('remove', true, function(next, done) {
        next();
        RollbackModel.remove({'_id': this._id}, function(err, count) {
            if (err) {
                done(err);
            }

            // if does not find id, will not err, count will be == 0
            done();
        });

        done();
    });
    //schema.post('save', function(doc) {
    //    
    //});
}

module.exports = save;
