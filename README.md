Mongoose Rollback machine 
=========================

[![Build Status](https://travis-ci.org/Snkz/mongoose-rollback.svg?branch=master)](https://travis-ci.org/Snkz/mongoose-rollback)

## Overview
Mongoose-Rollback adds rollback abilities to a Model.

Look up previous document revisions as well as rollback\revert to any previous version.

Requires \_id field to exist and be a valid ObjectId field (12 byte string / 24 char hex)

A new field _version is added to the model, this can be ignored safely. An index can be set for this in the plugin options.

The \_\_v field is used by mongoose to help with concurrent updates, this is not altered in anyway.

Refer to model/model.js for an example on how to set it up.

The rollback model is stored in a seperate collection, the name is specified in the plugin options, \_hist is appened to the name. It is recommended you use the same collection name as the Schema you intend to keep history for.

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
Returns model at revision version_num Errors version does not exist.
```javascript
Model.currentVersion() 
```
Returns the current version number, this is different the checking the \_version field as it queries the history model instead. Can help with concurrent updates with outdated copies of a model.
```javascript
Model.history(min_version=0, max_version=current_version, callback(err, model_array))
```
Returns history of model changes between specified version number.

The history model can be directly accessed from your Schema. It is added as a static variable called RollbackModel.


### Coming Soon!
```javascript
Schema.plugin({connection: seperate_mongo_location})
```
Allow for history model to be stored somewhere else.

Delete support, will add field 'deleted' and just keep it at that. Can kind of wipe history now if you revert to 0 but will also add support for that too.

## About concurrency
Currently this is only tested with single updates to a model. I will make sure to allow the model to be updated from two seperate locations (currenly not tested) without breaking the revisioning system. Rollbacks will also soon work fine concurrenlty as well (rollbacks == updates under the hood);

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
