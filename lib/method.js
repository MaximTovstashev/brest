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
    this.uri = "/v" + description.version + "/" + description.noun + (description.uri?"/" + description.uri:"");
    this.method = description.method;
    this.noAuth = description.noAuth;
};

/**
 *
 * @param {Object} res http result object
 * @param {*} data result data
 * @param {Object} options result options:
 *      "code": HTTP Code
 *      "headers": response headers
 *      "cookies": {
 *          "name": cookie name,
 *          "value": cookie value,
 *          "options": options, as described in express.js
 *              }
 */
Method.prototype.send = function(res, data, options){
    if (_.isUndefined(options)) options = {};
    if (_.isUndefined(options.code)) options.code = 200;

    if (options.headers) res.set(options.headers);

    if (options.cookies) _.each(options.cookies, function(cookie){
        res.cookie(cookie.name, cookie.value, cookie.options);
    });

    if (_.isObject(data) && !options.ignoreJSON){
        res.json(data, options.code);
    }
    else {
        res.send(data, options.code);
    }
};

Method.prototype.getURI = function(){
    return this.uri;
};

Method.prototype.getMethod = function(){
    return this.method;
};

Method.prototype.onRequest = function(){

};

Method.prototype.handler = function(){

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