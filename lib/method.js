var _ = require('underscore');

/**
 * Error codes
 * @type {Object}
 */
var ec = require('./error_codes.js');


var descriptionMapping = {
    handler: true,
    method: true,
    noAuth: false,
    stub: false
};

/**
 *
 * @param {Express} app Express.js instance
 * @param description
 * @constructor
 */
var Method = function(app, description){
    this._app = app;
    if (!_.isString(description.noun)) throw {message: "Noun is missing in the description"};
    this.uri = "/v" + description.version + "/" + description.noun + (description.uri?"/" + description.uri:"");
    _.each(descriptionMapping, function(required, key){
        if (description[key])
            this[key] = description[key];
        else if (required) throw {message: "Method description key \""+key+"\" is missing in "+this.uri};
    }, this);
    if (!_.isFunction(this.handler)) throw {message: "Handler must be a function in "+this.uri};

    //Register method in express
    this._app[this.method.toLowerCase()](this.uri, this.onRequest.bind(this));
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

Method.prototype.onRequest = function(req, res){
    // If method is stub, we do nothing, despite any other method properties.
    if (this.stub) {
        this.send(res, {Stub: "Not implemented yet!"});
        return this;
    }

    this.callHandler(req, res);
};

/**
 * Check if any of the extensions have confirmed or denied user access
 * @param {Object} req
 * @param {Function} callback
 */
Method.prototype.checkAuth = function(req, callback){
    if (this.noAuth) callback(true);
    else {
        //TODO: Iterate through the extensions here
        callback(true);
    }
};

/**
 * Processing resource request handler
 *
 * @param {Object} req  http request object
 * @param {Object} res http response object
 */
Method.prototype.callHandler = function(req, res){
    //Check authentication in async mode
    this.checkAuth(req, function(authPassed){
        if (authPassed){
            this.handler(req, function(err,data,options){
                if (_.isUndefined(options)) options = {};

                if (err){
                    options.code = ec.INTERNAL_SERVER_ERROR;
                    if (_.isString(err)) err = {message: err};
                    if (_.isNumber(err.code)) {
                        options.code = err.code;
                        delete err.code;
                    }
                    this.send(res,err,options);
                } else {
                    this.send(res,data,options);
                }
            }.bind(this));
        } else {
            this.send(res,{bREST:"You must be authorized to use this method"},{code: ec.AUTHENTICATION_FAILED});
        }
    }.bind(this));
};

module.exports = Method;