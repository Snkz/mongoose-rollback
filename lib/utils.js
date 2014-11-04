/* Utility functions */

module.exports = (function() {
    this.isOnlyDocument = function(docs) {
        if (docs !== null && docs.length == 1) {
            return true;
        }
        return false;
    }

    return this;
})();




