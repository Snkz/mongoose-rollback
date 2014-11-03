Mongoose Rollback machine 
=========================

[![Build Status](https://travis-ci.org/Snkz/Mongoose-Rollback)](https://travis-ci.org/Snkz/Rollback)

Mongoose-Rollback adds rollback abilities to a Model.

Look up previous document revisions as well as rollback to any previous version.

Requires _id field to be present and __v field to exist (this should already be the case by default).

## API

NOTE: THIS IS ALL TEMPORARY JUST LISTING OUT INTENDED FUNCTIONALITY!! 

Model.rollback(version_num, callback(err, obj))
Reverts model to version specified by version_num. Returns error if version is greater then models current version (if version supplied in model) and if version number doesnt exist.

Model.findRevision(id, version_num, callback(err, obj))
Returns model at revision version_num with specified id. Errors if obj not found or revision does not exist.

Model.diff(version_num, callback(err, obj_array))
Returns array of diffs between models revision num. Errors if id/revision does not exist.

Model.findDiff(id, version_num, callback(err, obj_array))
Returns array of diffs between id's current revision num and version_num. Errors if id/revision does not exist.
