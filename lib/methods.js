'use strict';

var utils = require('./utils.js');

function methods(schema) {
    var RollbackModel = schema.statics.RollbackModel;

    // Query hist model for cur version
    schema.methods.currentVersion = function (callback) {
        var id = this._id;

        RollbackModel.findOne({
                '_id': id
            }, {
                currentVersion: 1,
                _id: 0
            },
            callback
        );
    };

    // Return the version in data array
    schema.methods.getVersion = function (version, callback) {
        var id = this._id;
        var self = this;

        RollbackModel.findOne({'_id': id},
            {'data': {'$elemMatch': {'_version': version}}},
            function (err, hist) {
                if (err) {
                    callback(err, null);
                    return;
                }

                err = new Error('Model at version ' + version + ' does not exist');

                if (!hist) {
                    if (version !== 0) {
                        callback(err, null);
                        return;
                    }

                    utils.storeAsync(self, RollbackModel, 'Object', callback);
                    return;
                }

                var prevModel = hist.data[0];

                if (typeof prevModel === 'undefined') {
                    callback(err, null);
                    return;
                }

                callback(null, prevModel);
            }
        );
    };

    //Return data array in range supplied
    schema.methods.getHistory = function (min, max, callback) {
        var id = this._id;
        var skip = min || 0;
        var limit = max - skip + 1;
        var self = this;

        RollbackModel.findOne({
                '_id': id
            }, {
                'data': 1
            }, function (err, hist) {
                if (err) {
                    callback(err, null);
                    return
                }

                // if history model is empty, we will update and return it;
                if (!hist) {
                    // we know what to return, we can update model async
                    if (skip > 0) {
                        callback(err, []);
                        return;
                    }

                    utils.storeAsync(self, RollbackModel, 'Array', callback);
                    return;
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

                //XXX: Cuttting based on array index NOT version
                //TODO: Convert version to array range based on specified max stored value
                callback(err, hist.data.slice(skip, max));

            }
        );
    };

    // Update state to new version with updates from previous version
    schema.methods.rollback = function (version, callback) {
        var id = this._id;
        var v = this._version;
        var self = this;

        RollbackModel.findOne({'_id': id},
            {'data': {'$elemMatch': {'_version': version}}},
            function (err, hist) {
                if (err) {
                    callback(err, null);
                    return;
                }

                // update each field in model with old_version
                var prevModel = hist.data[0];
                if (typeof prevModel === 'undefined') {
                    err = new Error('Model at version ' + version + ' does not exist');
                    callback(err, null);
                    return;
                }

                Object.keys(prevModel).forEach(function (key) {
                    self[key] = prevModel[key];
                });

                // save changes and callback take care of rest
                self.save(callback);

            }
        );
    };

    // Revert state to previous update, remove new revisions
    schema.methods.revert = function (version, callback) {
        var id = this._id;
        var v = this._version;
        var self = this;

        if (isNaN(version)) {
            callback(new Error('version must be a number'), null);
            return;
        }

        RollbackModel.findOne({'_id': id},
            {'data': {'$elemMatch': {'_version': version}}},
            function (err, hist) {
                if (err) {
                    callback(err, null);
                    return;
                }

                // update each field in model with old_version
                var prevModel = hist.data[0];
                if (typeof prevModel === 'undefined') {
                    err = new Error('Model at version ' + version + ' does not exist');
                    callback(err, null);
                    return;
                }

                // Revert changes to model at v = version
                Object.keys(prevModel).forEach(function (key) {
                    self[key] = prevModel[key];
                });

                // Decrement version number (changes haven't been recorded yet);
                self['_version'] = version;

                // remove previous revisions
                schema.statics.RollbackModel.update({'_id': id},
                    {
                        currentVersion: version,
                        $pull: {'data': {'_version': {'$gte': version}}}
                    },
                    function (err) {
                        if (err) {
                            callback(err);
                            return; // couldn't remove array stuff
                        }

                        // save changes and callback take care of rest
                        self.save(callback);

                    });

            }
        );
    };

    schema.methods.addHistory = function (callback) {
        var v = this._version;
        var a = this._action;
        var id = this._id;
        var self = this;
        var histModel;

        // find and update existing Document
        RollbackModel.find({'_id': id}).exec(function (err, hists) {
            if (err) {
                callback(error, null);
                return;
            }

            if (!utils.isOnlyDocument(hists)) {
                // nothing found, create new document
                self._version = 0;
                self._action = 'create';
                self.createdAt = new Date();

                var hist_obj = {
                    currentVersion: 0,
                    _id: id,
                    data: [self.toObject()]
                };

                histModel = new RollbackModel(hist_obj);
                histModel.save(function (err, hist, numAffected) {
                    if (err) {
                        self._version = v;
                        self._action = a;
                        callback(error, null);
                    }
                    // update version now
                    callback(null);
                });
                return;
            }

            histModel = hists[0];

            // update version now before push
            self._version = histModel.data.length;
            self._action = 'update';

            // update existing model
            histModel.currentVersion = self._version;
            histModel.data.set(histModel.currentVersion, self.toObject());
            histModel.save(function (err, hist, numAffected) {
                if (err) {
                    // undo changes
                    self._version = v;
                    self._action = a;
                    callback(err, null);
                }

                callback(null);
            });
        });
    };

}


module.exports = methods;
