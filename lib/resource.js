/**
 * Error codes
 * @type {Object}
 */
var ec = require('./error_codes.js');

/**
 * HTTP method verbs
 * @type {Array}
 */
var verbs = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH", "TRACE"];

/**
 *
 * @param app {Object} express.js instance
 * @param description {Object} resource description object
 * @constructor
 */
var Resource = function(app, description){
    this._app = app;
    if (!description.noun) throw {message: 'Noun not provided for the resource'};
    this.version = description.version || 1;
    if (!_.isArray(description.resources)) throw {message: 'Required "resources" array in '+description.noun+' Resource'};

    this.
    _.each(description.resources, function(resource){

    });

};