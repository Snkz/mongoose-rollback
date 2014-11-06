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

Make sure to supply your connection name as an option (conn: mongodb://host/db} to the options field. Sometimes it can work without, most of the times no.

### Example Setup
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

### Example usage 
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
These extensions happen on <b>instances</b> of the model for convenience.
Callbacks take the same arguments Mongoose's save does.
```javascript
Model.rollback(version_num, callback(err, model))
```
Rollsback model to version specified by version_num. Returns error if version is greater then models current version (if version supplied in model) and if version number doesnt exist. Note: This is considered an 'update' i.e the version number is incremented and the model is updated with data from a previous revision.
```javascript
Model.revert(version_num, callback(err, model))
```
Reverts model to version specified by version_num. Returns error if version is greater then models current version (if version supplied in model) and if version number doesnt exist. Note: This is a destructive update  i.e the version number is set to the supplied version  and the model is updated with data from a previous revision. History after this version number is lost.

```javascript
Model.getVersion(version_num, callback(err, model))
```
Returns model at revision version_num Errors version does not exist. Creates a version 0 if neccassary;
```javascript
Model.currentVersion() 
```
Returns the current version number, this is different the checking the \_version field as it queries the history model instead. Can help with concurrent updates with outdated copies of a model.
```javascript
Model.history(min_version=0, max_version=current_version, callback(err, model_array))
```
Returns history of model changes between specified version number. Creates a version 0 if neccassary. Pass in values (0, BIG) to get all of your history;

```javascript
Schema.plugin({connection: seperate_mongo_location})
```
Allow for history model to be stored somewhere else.


The history model can be directly accessed from your Schema. It is added as a static variable called RollbackModel.

### Coming Soon!
Delete support, will add field 'deleted' and just keep it at that. Can kind of wipe history now if you revert to 0 but will also add support for that too.

Build history on the fly, currently only updates add entries to the history model. In the VERY near future, any method call will store a copy of the model if one does not exist. This will be good for things such as bulk uploads where history cannot be generated (by passing mongoose).

## About concurrency
Currently this is only tested with single updates to a model. I will make sure to allow the model to be updated from two seperate locations (currenly not tested) without breaking the revisioning system. Rollbacks will also soon work fine concurrenlty as well (rollbacks == updates under the hood);

Initial commits to the hist model are also kind of iffy cause of \_id collisions

The following three ops CAN create new hist models:
    save
    getVersion
    history

Try not to do anything concurrently on models that haven't been init'd through mongoose's save. Updates after are A-OK.

Reverts however are dangerous, I will not make any promises on this right now but using mongooses \_\_v field a may be able to sort this out at some point.

Either way, it is best to not revert willy-nilly. That should be a privileged operation!

## About Mongoose
Mongoose does not hook into findByIdUpdate/remove mongo methods. Those bypass any middleware by design, including this rollback system. In order to keep history correctly make sure to use this pattern for updates instead.

```javascript
Model.find({field: value}, function (err, model) {
    model.somefield = somevalue;
    model.save(function (err, updatedModel) {
        if(err) {
            console.error(err);
        }
        // more code
    });
});
```


Finally, this is being updated very rapidly. Please open issues, report bugs etc and I will get to them.
