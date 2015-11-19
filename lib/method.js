var _ = require('lodash'),
    async = require('async'),
    multer = require('multer');

/**
 * Error codes
 * @type {Object}
 */
var ec = require('./error_codes.js');
var c = require('./const.js');

/**
 * Map the description properties to the Method object. Key stands for property name, value defines if the
 * property is optional (false) or required (true)
 * @type {Object}
 */
var descriptionMapping = {
    filters: false,
    handler: true,
    include: false,
    method: true,
    noAuth: false,
    noCache: false,
    stub: false
};

/**
 *
 * @param {Brest} brest Brest instance
 * @param description
 * @constructor
 */
var Method = function(brest, description){
    var self = this;

    self._brest = brest;
    self._app = brest.getApp();
    self.description = description;

    self._extensions = {
        beforeHandler: [],
        authenticate: [],
        afterHandler: []
    };

    if (!_.isString(description.noun)) throw new Error("Noun is missing in the description");
    self.uri = "/v" + description.version + "/" + description.noun + (description.uri?"/" + description.uri:"");
    _.each(descriptionMapping, function(required, key){
        if (description[key])
            self[key] = description[key];
        else if (required) throw new Error("Method description key \""+key+"\" is missing in "+self.uri);
    }, self);
    if (!_.isFunction(self.handler)) throw new Error("Handler must be a function in "+self.uri);
    if (!description.middle) description.middle = [];
    if (description.upload) {
        var fieldnames = description.upload.fieldnames;
        var multerOptions = {};
        if (description.upload.dest) {
            multerOptions = { dest: description.upload};
        }
        if (description.upload.destination && description.upload.filename) {
            multerOptions = {
                storage: multer.diskStorage({
                    destination: description.upload.destination,
                    filename: description.upload.filename
                })
            };
        }
        var mwMulter = multer(multerOptions);
        var middleware = false;
        if (_.isString(fieldnames)) {
            middleware = mwMulter.single(fieldnames);
        } else if (_.isArray(fieldnames)) {
            middleware = mwMulter.fields(fieldnames);
        } else if (_.isObject(fieldnames)) {
            middleware = mwMulter.fields(fieldnames.name, fieldnames.maxCount);
        }
        if (middleware) {
            description.middle.push(middleware);
        }
    }
    //Register method in express
    self._app[self.method.toLowerCase()](self.uri, description.middle, self.onRequest.bind(self));
};

Method.prototype.getErrorCodes = function(){
    return ec;
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
 *      "file": send user specified file
 *      "fileName": set a name for the file, if "file" is set
 *      "redirect": redirect user by URL
 */
Method.prototype.send = function(res, data, options){
    var self = this;
    if (!data) data = {brest: 'ok'}; //Express seems to crash on empty return
    if (!options) options = {};
    if (!options.code) options.code = 200;
    if (options.headers) res.set(options.headers);

    if (options.cookies) _.each(options.cookies, function(cookie){
        res.cookie(cookie.name, cookie.value, cookie.options);
    });

    if (_.isObject(data) && !options.ignoreJSON){
        if (options.file){
            res.download(options.file, options.fileName, function(err){
                if (options.fileCallback) options.fileCallback(err);
                else {
                    if (err) console.log(err);
                }
            });
            return;
        }
        if (options.redirect) {
            res.redirect(options.redirect);
            return;
        }
        res.status(options.code).json(data);
        self._brest.counterInc(c.COUNTER_OUT);
        self._brest.counterDec(c.COUNTER_PROCESS);
    }
    else {
        res.status(options.code).send(data);
        self._brest.counterInc(c.COUNTER_OUT);
        self._brest.counterDec(c.COUNTER_PROCESS);
    }
};

/**
 * Get method uri
 * @returns {string}
 */
Method.prototype.getURI = function(){
    return this.uri;
};

/**
 * Get method verb
 * @returns {string}
 */
Method.prototype.getMethod = function(){
    return this.method;
};

/**
 * Proceed with request and call handler
 * @param req
 * @param res
 * @returns {Method}
 */
Method.prototype.onRequest = function(req, res){
    var self = this;
    self._brest.counterInc(c.COUNTER_IN);
    self._brest.counterInc(c.COUNTER_PROCESS);

    // If method is stub, we do nothing, despite any other method properties.
    if (self.stub) {
        self.send(res, {Stub: "Not implemented yet!"});
        return self;
    }

    if (self.noCache) {
        res.header('Last-Modified', (new Date()).toUTCString());
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
    }

    req.filters = {};

    // Fill the filter list, if any
    _.each(req.query,function(value, filter){
        if (self.filters && self.filters[filter]){

            //Replace 'me' or 'mine' with some user parameter, if user is registered
            if (self.filters[filter].replaceMe && (value=='me' || value=='mine')) {
                if (req.user && req.user[self.filters[filter].replaceMe]) {
                    value = req.user[self.filters[filter].replaceMe];
                } else {
                    send(res, {Error: "You must be authorized to use '"+filter+"=me' filter"},{code: ec.AUTHENTICATION_FAILED})
                }
            }

            //Convert value to array if received data is not an array already
            if (self.filters[filter].toArray) {
                if (!_.isArray(value)) value = [value];
            }

            req.filters[filter] = value;
        }
    });

    req.include = [];
    if (req.query.include) {
        if (!_.isUndefined(self.include) && req.query["include"]) {
            var include_no_spaces = req.query["include"].replace(/ /gi, '');
            var split_arr = include_no_spaces.split(",");
            if (split_arr != null && split_arr.length > 0) {
                _.each(split_arr, function(incl) {
                    if (!_.isUndefined(self.include[incl])) {
                        req.include.push(incl);
                    }
                });
            }
        }
    }

    async.each(self._extensions.beforeHandler, function(extension, callback){
            extension(self, req, callback);
        },
        function(err){
            if (err) {
                console.log('ERROR IN METHOD:', err);
                var errBody = {};
                var errCode = ec.INTERNAL_SERVER_ERROR;
                if (err.body) errBody = err.body;
                else errBody = err;
                if (err.code) errCode = err.code;
                self.send(res, errBody, {code: errCode});
            } else {
                self.callHandler(req, res);
            }
        });
};

/**
 * Check if any of the extensions have confirmed or denied user access
 * @param req
 * @param {Function} callback
 */
Method.prototype.checkAuth = function(req, callback){
    var self = this;
    if (this.noAuth) callback(true);
    else {
        async.each(this._extensions.authenticate, function(extension, callback){
           extension(self, req, callback);
        },
        function(err){
            callback(_.isNull(err));
        });
    }
};

/**
 * Processing resource request handler
 *
 * @param {Object} req  http request object
 * @param {Object} res http response object
 */
Method.prototype.callHandler = function(req, res){
    try {
        //Check authentication in async mode
        this.checkAuth(req, function (authPassed) {
            if (authPassed) {
                this.handler(req, function (err, data, options) {
                    if (_.isUndefined(options)) options = {};
                    if (err) {
                        if (_.isString(err)) err = {Error: err};
                        if (_.isNumber(err.code)) {
                            options.code = err.code;
                            delete err.code;
                        } else {
                            options.code = ec.INTERNAL_SERVER_ERROR;
                        }
                        this.send(res, err, options);
                    } else {
                        this.send(res, data, options);
                    }
                }.bind(this));
            } else {
                this.send(res, {bREST: "You must be authorized to use this method"}, {code: ec.AUTHENTICATION_FAILED});
            }
        }.bind(this));
    } catch (error) {
        console.log(error);
        console.log(error.stack);
        this.send(res, error, {code: ec.INTERNAL_SERVER_ERROR});
    }
};

/**
 * Register new extension
 * @param {Object} extension
 * @param {Function} callback
  */
Method.prototype.use = function(extension, callback){
    var self = this;
    if (extension.method) {
        var keys = _.keys(self._extensions);
        _.each(keys, function (key) {
            if (_.isFunction(extension.method[key])) self._extensions[key].push(extension.method[key]);
        });
    }

    if (extension.filters) {
        _.each(extension.filters, function(filter, key){
            if (!self.filters) self.filters = {};
            self.filters[key] = filter;
        });
    }

    callback();
};

module.exports = Method;