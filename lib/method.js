var _ = require('underscore');

/**
 * Error codes
 * @type {Object}
 */
var ec = require('./error_codes.js');

/**
 *
 * @param {Express} app Express.js instance
 * @param description
 * @constructor
 */
var Method = function(app, description){
    this._app = app;

};

Method.prototype.onRequest = function(){

};

/**
 * Processing resource request handler
 *
 * @param {Object} req  http request object
 * @param {Object} res http response object
 * @param {Object} rd resource data
 */
Method.prototype.onResult = function(req, res, rd){

};

module.exports = Method;