Mongoose Rollback machine 
=========================

[![Build Status](https://travis-ci.org/Snkz/mongoose-rollback.svg?branch=master)](https://travis-ci.org/Snkz/mongoose-rollback)

## Overview
Mongoose-Rollback adds rollback abilities to a Model.

Look up previous document revisions as well as rollback\revert to any previous version.

Requires _id field to exist (true by default) Has not been tested on custom _id fields as of yet. (i.e should be object id);

A new field _version is added to the model, this can be ignored safely. An index can be set for this in the plugin options.

The \_\_v field is used by mongoose to help with concurrent updates, this is not altered in anyway.

The rollback model is stored in a seperate collection, the name is specified in the plugin options, \_hist is appened to the name. It is recommended you use the same collection name as the Schema you intend to keep history for.

Make sure to supply your connection name as an option (conn: mongodb://host/db} to the options field if you intend to use a seperate connection!.

DELETES CASCADE! Delete your model => history is removed. I trust that you know what youre doing. 

#### Example Setup
```javascript

var mongoose = require('mongoose');
var rollback = require('mongoose-rollback');

var Schema = mongoose.Schema;
var ModelSchema = new Schema({
    name: {
        type: String,
        required: true
        },

    createdAt: {
        type: Date,
        default: Date.now
        },
    
    data: {
        type: String
        }
    }
);

ModelSchema.plugin(rollback, {
    index: true, // index on _version field
    conn: 'mongodb://localhost/test', // required if connection isn't explict
    collectionName: 'model_collection' // your collection name or custom collection
});

var Model;

if (mongoose.models.Model) {
    Model = mongoose.model('Model');
} else {
    Model = mongoose.model('Model', ModelSchema, 'model_collection');
}

exports.Model = Model;
```

#### Example usage 
```javascript
describe('Rollback Hell', function(done) {

    it('should rollback to PREVIOUS version', function(done) {
        var name = 'Hello';
        var data = 'World';
        var model = new Model({name: name, data: data});
        model.save(function(err, model) {
            if (err) throw (err);

            model.should.have.property('_version');
            model._version.should.be.exactly(0);
            model.name = "Hey";
            model.data = "Yo";

            model.save(function(err, model) {
                if (err) throw (err);

                model.should.have.property('_version');
                model._version.should.be.exactly(1);

                model.rollback(0, function(err, hist) {
                    if (err) throw (err);
                    hist.name.should.match(name);
                    hist.data.should.match(data);
                    hist._version.should.equal(2);
                    
                    model.name.should.match(name);
                    model.data.should.match(data);
                    model._version.should.equal(2);
                    done();
                });
            });
        });
        
    });
});
```
## API
#### Methods
These extensions happen on <b>instances</b> of the model for convenience.
Callbacks take the same arguments Mongoose's save does.
```javascript
model.rollback(version_num, callback(err, model))
```
Rollsback model to version specified by version_num. Returns error if version is greater then models current version (if version supplied in model) and if version number doesnt exist. Note: This is considered an 'update' i.e the version number is incremented and the model is updated with data from a previous revision.
```javascript
model.revert(version_num, callback(err, model))
```
Reverts model to version specified by version_num. Returns error if version is greater then models current version (if version supplied in model) and if version number doesnt exist. Note: This is a destructive update  i.e the version number is set to the supplied version  and the model is updated with data from a previous revision. History after this version number is lost.

```javascript
model.getVersion(version_num, callback(err, model))
```
Returns model at revision version_num Errors version does not exist. Creates a version 0 if neccassary;
```javascript
Model.currentVersion() 
```
Returns the current version number, this is different the checking the \_version field as it queries the history model instead. Can help with concurrent updates with outdated copies of a model.
```javascript
model.history(min_version=0, max_version=current_version, callback(err, model_array))
```
Returns history of model changes between specified version number. Creates a version 0 if neccassary. Pass in values (0, BIG) to get all of your history;

#### Schema
Options for initing the plugin are pretty self-explanatory.
```javascript
Schema.plugin({
    conn: seperate_mongo_location,
    index: boolean,
    collectionName: mongo_collection_name
});

Schema.RollbackModel
```
The history model can be directly accessed from your Schema. It is added as a static variable called RollbackModel.

#### Statics
These functions are accessed through <b>your Schema</b>. 

```javascript
Schema.wipeHistory(callback);
```
Nuke the rollback collection, there is no going back. Callback takes the same arguments mongoose's remove does.

```javascript
Schema.initHistory(id, callback(err, model_array))
```
For models that have been inserted outside of mongoose's save methods. This will save it without updating the version number.
This is also done on calls to .getVersion(0, callback); and .history(0,max, callback); internally on existing models that have no history. Do this only if you care about preserving the current version of the model. Future updates will be recorded just fine with or without this call to init. 

### Coming Soon!
Handle concurrency, (see below)

Mark models to prevent history updates (can be toggled on the fly).
Allow for storage of diffs along with full model. 
Remove requirement to add in collection name removed.

## About concurrency
Concurrent saves currently work like they do in mongo, latest update wins. Initial commits to the hist model are also kind of iffy cause of \_id collisions. Avoid initing history for an existing model concurrently.

Rollbacks have not been tested concurrently, however they are expected to work like save. Last rollback is the one that will happen. Confirm version value after a rollback incase you expect to do such a thing often.

The following three ops CAN create new hist models:
    save
    getVersion
    history

Try not to do anything concurrently on models that haven't been init'd through mongoose's save. Updates after are A-OK.

Reverts however are dangerous, I will not make any promises. I will document expected behaviour after more testing. Either way, it is best to not revert willy-nilly. That should be a privileged operation!

## About Mongoose
Mongoose does not hook into findByIdUpdate/remove mongo methods. Those bypass any middleware by design, including this rollback system. In order to keep history correctly make sure to use this pattern for updates instead.

```javascript
Model.find({field: value}, function (err, model) {
    model.somefield = somevalue;
    model.save(function (err, updatedModel) {
        // more code
    });
});
```
Likewise, deletes should also be done through mongoose. Make sure to do one of the following:

```javescript
Model.remove({_id: id}).exec(function(err, num_removed) {
    // more code
});

// OR on a model instance

model.remove(function(err, model) {
    // more code
});
```

They're other mongoose ways to update/delete, they should work fine. Incase an issue does come up, try the above and report it please.

Finally, this is ready to use but being updated very rapidly. Please open issues, report bugs etc and I will get to them.
