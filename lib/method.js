const _ = require('lodash'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter,
    multer = require('multer'),
    toobusy = require('toobusy-js');

/**
 * Error codes
 * @type {Object}
 */
const   ec = require('./http_codes.js'),
        c = require('./const.js');

/**
 * Empty handler for the cases when handler is not defined in the API description for some reason
 * @param req
 * @param callback
 */
const emptyHandler = function(req, callback) {
    callback({error: 'Handler not defiled'});
};


const transformFilter = require('./transform');

class Method extends EventEmitter{

    /**
     *
     * @param {Brest} brest Brest instance
     * @param description
     * @constructor
     */
    constructor(brest, description) {
        super();
        const self = this;
        self.ready = false;
        this._brest = brest;
        this._app = brest.getApp();
        this.$fields = description;

        this._extensions = {
            beforeHandler: [],
            authenticate: [],
            afterHandler: []
        };

        this._replaceMe = ['me', 'mine'].concat(brest.getSetting('replaceMe', []));

        if (!_.isString(description.noun)) throw new Error("Noun is missing in the description");
        var uri = "/v" + description.version + "/" + description.noun + (description.uri?"/" + description.uri:"");
        _.each(description, function(property, key){
            self[key] = property;
        }, this);
        if (!_.isFunction(this.handler)) this.handler = emptyHandler;
        if (!_.isArray(description.middle)) {
            if (_.isFunction(description.middle)) {
                description.middle = [description.middle];
            } else {
                if (description.middle) console.log(('WARNING: description.middle is set, but is neither array nor function for ' + description.noun + '/' + description.uri).yellow);
                description.middle = [];
            }

        }

        if (this._brest.getSetting('toobusy.maxLag')) {toobusy.maxLag = self._brest.getSetting('toobusy.maxLag')}
        if (this._brest.getSetting('toobusy.interval')) {toobusy.interval = self._brest.getSetting('toobusy.interval')}

        var tooBusyString = self._brest.getSetting('application') + " is too busy to reply";
        var tooBusyEnabled = self._brest.getSetting('toobusy.enabled', true);


        var tooBusyMiddleware = function(req, res, next) {
            if (toobusy()) {
                res.status(ec.TOO_MANY_REQUESTS).send(tooBusyString);
            } else {
                next();
            }
        };

        _.each(description.filters, function(filter, key){
            self.checkFilterAlias(key, filter);
        });

        if(tooBusyEnabled) {description.middle.push(tooBusyMiddleware);}

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

        async.each(brest.getExtensions(), function(extension, next){
            self.use(extension, next);
        }, function(err){
            if (err) throw err;
            //Register method in express
            self.uri = uri;
            self._app[self.method.toLowerCase()](uri, description.middle, self.onRequest.bind(self));
            self.ready = true;
            self.emit(c.EVENT_READY);
        });
    }

    getErrorCodes(){
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
    send(res, data, options){

        const self = this;

        if (!data) data = {brest: 'ok'}; //Express seems to crash on empty return
        if (!options) options = {};
        if (!options.code) options.code = ec.HTTP_OK;
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
    getURI(){
        return this.uri;
    };

    /**
     * Get method verb
     * @returns {string}
     */
    getVerb(){
        return this.method;
    };

    /**
     * Get single description field by key
     * @param key
     * @returns {*}
     */
    getField(key) {
        return this.$fields[key];
    };

    getFields() {
        return this.$fields;
    }

    /**
     * Get Brest instance
     * @returns {Brest|*}
     */
    getBrest() {
        return this._brest;
    };

    /**
     * Proceed with request and call handler
     * @param req
     * @param res
     * @returns {Method}
     */
    onRequest(req, res){
        const self = this;
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

        if (self.obsolete) {
            console.log('WARNING: Method ' + self.getVerb() + ' ' + self.getURI() + ' is obsolete' + (_.isString(self.obsolete) ? ' use '+self.obsolete+' instead.':'.'));
        }

        req.filters = {};
        // Fill the filter list, if any
        if (self.filters) {
            //Assign default values if any
            _.each(self.filters, function(filter, key){
                if (!_.isUndefined(filter.default)) {
                    req.query[key] = req.query[key] || filter.default;
                }
            });
            _.each(req.query, function (value, filter) {
                if (filter === 'include') {
                    return;
                    //this does not break. _.each will always run
                    //the iterator function for the entire array
                    //return value from the iterator is ignored
                }
                if (self.filterAlias && self.filterAlias[filter]) {
                    filter = self.filterAlias[filter];
                }
                if (self.filters[filter]) {
                    let f = self.filters[filter];
                    //Replace 'me' or 'mine' with some user parameter, if user is registered
                    if (f.replaceMe && (self._replaceMe.indexOf(value) > -1)) {
                        if (req.user && req.user[f.replaceMe]) {
                            value = req.user[f.replaceMe];
                        } else {
                            send(res, {Error: "You must be authorized to use '" + filter + "='" + value + "' filter"}, {code: ec.AUTHENTICATION_FAILED})
                        }
                    }

                    value = self.getBrest().transformator.apply(f, value);
                    req.filters[filter] = value;
                }
            });
        }

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
    checkAuth(req, callback){
        const self = this;
        if (self.noAuth) return callback();
        async.each(self._extensions.authenticate, function(extension, callback){
                extension(self, req, callback);
            },
            function(err){
                callback(err);
            });
    };

    /**
     * Processing resource request handler
     *
     * @param {Object} req  http request object
     * @param {Object} res http response object
     */
    callHandler(req, res){
        const self = this;

        function rejectFields(result, fields) {
            // console.log('REJECT', result, fields);
            function rejectObject(obj, fields) {
                _.each(fields, function (field) {
                    _.unset(obj, field);
                    // console.log('AFTER', obj);
                });
                // console.log('EXITING', obj);
                return obj;
            }

            if (_.isArray(result)) return _.map(result, function(single_entry){
                return rejectObject(single_entry, fields);
            });
            if (_.isObject(result)) {
                return rejectObject(result, fields);
            }
            return result;
        }

        try {
            //Check authentication in async mode
            self.checkAuth(req, function (authError) {
                if (!authError) {
                    self.handler(req, function (err, result, options) {
                        if (!_.isEmpty(err)) self._brest.emit(c.EVENT_ERROR, {error: err});
                        if (!_.isEmpty(self.$fields.screen)
                            && _.isArray(self.$fields.screen.noAuth)
                            && _.isEmpty(req.user)) {

                            _.each(self.$fields.screen.noAuth, function(key){
                                if (_.isObject(result)) delete result[key];
                                else {
                                    if (_.isArray(result)) {
                                        _.each(result, function(elt){
                                            if (_.isObject(elt)) delete elt[key];
                                        });
                                    }
                                }
                            });
                        }
                        if (!_.isEmpty(self.$fields.reject)){
                            if (_.isArray(self.$fields.reject)) {

                                result = rejectFields(result, self.$fields.reject);
                            }
                            if (_.isObject(self.$fields.reject)) {
                                if (_.isArray(self.$fields.reject.noAuth) && _.isEmpty(req.user)) {
                                    result = rejectFields(result, self.$fields.reject.noAuth);
                                }
                            }
                            if (req.user && !_.isEmpty(req.user.roles)) {
                                var affectingRoles = _.intersection(_.keys(_.omit(self.$fields.reject, ['noAuth'])), req.user.roles);
                                _.each(affectingRoles, function (role) {
                                    result = rejectFields(result, self.$fields.reject[role]);
                                });
                            }
                        }
                        if (_.isUndefined(options)) options = {};
                        if (err) {
                            if (_.isString(err)) err = {error: err};
                            if (_.isNumber(err.code)) {
                                options.code = err.code;
                                delete err.code;
                            } else {
                                options.code = ec.INTERNAL_SERVER_ERROR;
                            }
                            self.send(res, err, options);
                        } else {
                            self.send(res, result, options);
                        }
                    }.bind(self));
                } else {
                    self._brest.emit(c.EVENT_AUTH_FAILED, {
                        res: res,
                        method: self.method
                    });
                    var options = {};
                    if (!authError.code) {
                        options.code = ec.AUTHENTICATION_FAILED;
                    }
                    else {
                        options.code = authError.code;
                        delete authError.code;
                    }

                    self.send(res, authError, options);
                }
            }.bind(self));
        } catch (error) {
            self._brest.emit(c.EVENT_ERROR, {
                error: error,
                stack: error.stack
            });
            console.log(error);
            console.log(error.stack);
            self.send(res, error, {code: ec.INTERNAL_SERVER_ERROR});
        }
    };

    /**
     * Register new extension
     * @param {Object} extension
     * @param {Function} callback
     */
    use(extension, callback){
        const self = this;
        async.waterfall(
            [
                function(next) {
                    if (extension.method) {
                        var keys = _.keys(self._extensions);
                        _.each(keys, function (key) {
                            if (_.isFunction(extension.method[key])) self._extensions[key].push(extension.method[key]);
                        });
                        if (_.isFunction(extension.method.init)) {
                            extension.method.init(self, next);
                        }
                        else next(null, extension)
                    } else next(null, extension);
                },
                function(extension, next) {
                    if (extension.filters) {
                        _.each(extension.filters, function(filter, key){
                            self.addFilter(key, filter);
                        });
                    }
                    next();
                }
            ],
            callback
        );
    };

    checkFilterAlias(key, filter) {
        const self = this;
        if (_.isString(filter.alias)) {
            filter.alias = [filter.alias];
        }
        if (_.isArray(filter.alias)) {
            if (_.isEmpty(self.filterAlias)) self.filterAlias = {};
            _.each(filter.alias, function(alias){
                self.filterAlias[alias] = key;
            });
        }
    };

    /**
     * Add filter by key
     * @param key
     * @param filter
     */
    addFilter(key, filter) {
        const self = this;
        if (!self.filters) self.filters = {};
        if (filter.override) {
            self.filters[key] = filter;
        } else {
            self.filters[key] = _.defaultsDeep(self.filters[key], filter);
        }
        self.checkFilterAlias(key, filter);
    };

    /**
     * Check if method is enabled in current environment.
     * @param {Brest} brest
     * @param {Object} description
     * @returns {boolean}
     */
    static checkEnabled(brest, description) {
        //Checking if method is enabled in current environment
        let enabled = true;

        if (!_.isUndefined(description.enabled)) {
            var enabledIf = description.enabled;
            if (_.isBoolean(enabledIf)) {
                enabled = enabledIf;
            }
            else if (_.isFunction(enabledIf)) {
                enabled = enabledIf(description);
            } else {
                if (_.isString(enabledIf)) {enabledIf = [enabledIf]}
                if (_.isArray(enabledIf)) {
                    enabled = _.reduce(enabledIf, function(current, key){
                        return current && Boolean(brest.getSetting(key));
                    }, true);
                } else if (_.isObject(enabledIf)) {
                    enabled = _.reduce(enabledIf, function(current, value, key){
                        return current && brest.getSetting(key) == value;
                    }, true);
                }
            }
        }

        if (!enabled) return false;

        if (!_.isUndefined(description.disabled)) {
            var disabledIf = description.disabled;
            if (_.isBoolean(disabledIf)) enabled = !disabledIf;
            else if (_.isFunction(disabledIf)) {
                enabled = !disabledIf(description);
            } else {
                if (_.isString(disabledIf)) {disabledIf = [disabledIf]}
                if (_.isArray(disabledIf)) {
                    enabled = _.reduce(disabledIf, function(current, key){
                        return current && !Boolean(brest.getSetting(key));
                    }, true);
                } else if (_.isObject(disabledIf)) {
                    enabled = _.reduce(disabledIf, function(current, value, key){
                        return current && !(brest.getSetting(key) == value);
                    }, true);
                }
            }
        }

        return enabled;
    };
}

module.exports = Method;