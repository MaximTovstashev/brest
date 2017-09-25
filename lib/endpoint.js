'use strict';

const _ = require('lodash'),
    async = require('async'),
    cors = require('cors'),
    EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    mime = require('mime-types'),
    path = require('path');

const intel = require('intel');

/**
 * Error codes
 * @type {Object}
 */
const code = require('./http_codes.js'),
    c = require('./const.js'),
    generateReturnableError = require('./utils/generate_returnable_error'),
    rejectFields = require('./utils/reject_fields'),
    required = require('./utils/reqired');

/**
 * Empty handler for the cases when handler is not defined in the API description for some reason
 * @param req
 * @param callback
 */
const emptyHandler = function (req, callback) {
    callback({error: 'Handler not defined'});
};

const fieldsReplacement = {
    uri: '_uri',
    method: '_verb'
};

class Endpoint extends EventEmitter {

    get app() {
        return this._app;
    }

    get brest() {
        return this._brest;
    }

    get fields() {
        return this.$fields;
    }

    get verb() {
        return this._verb;
    }

    get uri() {
        return this._uri;
    }

    get extensions() {
        return this._extensions;
    }

  /**
   *
   * @param {Brest} brest Brest instance
   * @param description
   * @constructor
   */
    constructor(brest = required('brest'), description = required('description')) {
        super();
        this.ready = false;
        this._brest = brest;
        this._app = brest.app;
        this.$fields = description;

        this._extensions = {
            beforeHandler: [],
            authenticate: [],
            afterHandler: []
        };

        this._replaceMe = ['me', 'mine'].concat(this.brest.getSetting('replaceMe', []));

        if (!_.isString(this.$fields.noun)) throw new Error('Noun is missing in the description');

        const apiUrl = [];
        const apiUrlSettings = this.brest.getSetting('apiUrl') || this.brest.getSetting('api_url') || {};
        if (apiUrlSettings.prefix) apiUrl.push(apiUrlSettings.prefix);
        if (!apiUrlSettings.unversioned) apiUrl.push(`v${this.$fields.version}`);
        apiUrl.push(this.$fields.noun);
        if (this.$fields.uri) apiUrl.push(this.$fields.uri);

        const uri = (apiUrl[0].charAt(0) === '/' ? '' : '/') + path.join(...apiUrl);

        _.each(this.$fields, (property, key) => {
            this[fieldsReplacement[key] || key] = property;
        });

        intel.config(brest.getSetting('intel') || {});
        this.log = intel.getLogger(`brest.${this.verb}${uri}`);

        if (!_.isFunction(this.handler)) this.handler = emptyHandler;
        if (!_.isArray(this.$fields.middle)) {
            if (_.isFunction(this.$fields.middle)) {
                this.$fields.middle = [this.$fields.middle];
            } else {
                if (this.$fields.middle) this.log.warn(('WARNING: description.middle is set, but is neither array nor function for ' + this.$fields.noun + '/' + this.$fields.uri).yellow);
                this.$fields.middle = [];
            }
        }

        _.each(this.$fields.filters, (filter, key) => {
            this.checkFilterAlias(key, filter);
        });

        if (brest.getSetting('toobusy.enabled', false)) {
            this.$fields.middle.push(require('./middleware/toobusy')(this.brest));
        }

    //Kick in cors middleware
        if (this.$fields.allowCORS) {
            this.$fields.middle.push(cors({optionsSuccessStatus: code.HTTP_OK}));

      //Enable pre-flight "OPTIONS" request support
            if (this.verb.toUpperCase() !== c.VERB_GET) {
                this.app.options(uri, cors({optionsSuccessStatus: code.HTTP_OK}));
            }
        }

        if (this.$fields.upload) {
            this.$fields.middle.push(require('./middleware/multer')(this.$fields));
        }

        if (this.$fields.bodyParser) {
            require('./middleware/bodyparser').initEndpoint(this.brest, this.$fields);
        }

        async.each(brest.extensions, (extension, next) => {
            this.use(extension, next);
        }, (err) => {
            if (err) throw err;
      //Register endpoint in express
            this._uri = uri;
            this.app[this.verb.toLowerCase()](uri, this.$fields.middle, this.onRequest.bind(this));
            this.ready = true;
            this.emit(c.EVENT_READY);
        });
    }

    getErrorCodes() {
        this.log.warn('Obsolete Endpoint.getErrorCodes() method. Use require("brest").httpCodes; instead');
        return code;
    }

    _download(res, options) {
        async.waterfall([
            (next) => {
                if (options.autoMime) {
                    res.header('content-type', mime.lookup(options.file));
                }
                if (!options.fileName) {
                    options.fileName = path.basename(options.file);
                }
                res.header('content-disposition', 'attachment; filename=' + options.fileName);
                res.download(options.file, options.fileName, next);
            },
            (next) => {
                if (options.autoUnlink === true) {
                    return fs.unlink(options.file, next);
                }
                next();
            }
        ], (err) => {
            if (err) this.log.error(err);
            if (options.fileCallback) options.fileCallback(err);
        });
    }

    _countOutbound() {
        this.brest.counterInc(c.COUNTER_OUT);
        this.brest.counterDec(c.COUNTER_PROCESS);
    }

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
    send(res = required('res'), data = {brest: 'ok'}, options = {}) {
        if (!options.code) options.code = code.HTTP_OK;
        if (options.headers) res.set(options.headers);

        if (options.cookies) _.each(options.cookies, (cookie) => {
            res.cookie(cookie.name, cookie.value, cookie.options);
        });

        if ((_.isObject(data) || _.isNumber(data) || _.isString(data)) && !options.ignoreJSON) {
            if (options.file) {
                this._download(res, options);
                this._countOutbound();
                return;
            }
            if (options.redirect) {
                res.redirect(options.redirect);
                this._countOutbound();
                return;
            }
            res.status(options.code).json(data);
            this._countOutbound();
        }
        else {
            res.status(options.code).send(data);
            this._countOutbound();
        }
    }

  /**
   * Get endpoint uri
   * @deprecated
   * @returns {string}
   */
    getURI() {
        this.log.warn('WARNING: Deprecated function Endpoint.getURI() use Endpoint.uri instead'.yellow);
        return this._uri;
    }

  /**
   * Get endpoint verb
   * @deprecated
   * @returns {string}
   */
    getVerb() {
        this.log.warn('WARNING: Deprecated function Endpoint.getVerb() use Endpoint.verb instead'.yellow);
        return this._verb;
    }

  /**
   * Get single description field by key
   * @param key
   * @returns {*}
   */
    getField(key = required('key')) {
        return this.$fields[key];
    }

    getFields() {
        this.log.warn('WARNING: Deprecated function Endpoint.getFields() use Endpoint.fields instead'.yellow);
        return this.$fields;
    }

  /**
   * Get Brest instance
   * @deprecated
   * @returns {Brest|*}
   */
    getBrest() {
        this.log.warn('WARNING: Deprecated function Endpoint.getBrest() use Endpoint.brest instead'.yellow);
        return this._brest;
    }

  /**
   * Proceed with request and call handler
   * @param req
   * @param res
   * @returns {Endpoint}
   */
    onRequest(req = required('req'), res = required('res')) {

        this.brest.counterInc(c.COUNTER_IN);
        this.brest.counterInc(c.COUNTER_PROCESS);

    // If endpoint is stub, we do nothing, despite any other endpoint properties.
        if (this.stub) {
            this.send(res, (_.isBoolean(this.stub) && this.stub) ? {Stub: 'Not implemented yet!'} : this.stub);
            return this;
        }

        if (this.noCache) {
            res.header('Last-Modified', (new Date()).toUTCString());
            res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            res.header('Expires', '-1');
            res.header('Pragma', 'no-cache');
        }

        if (this.obsolete || this.deprecated) {
            const deprecated = this.deprecated || this.obsolete;
            const deprecated_message = `Endpoint ${this.verb} ${this.uri} is deprecated ${_.isString(deprecated) ? ` use ${deprecated} instead` : '.'}`;
            res.header('Warning', deprecated_message);
            this.log.warn(`WARNING: ${deprecated_message}`);
        }

        req.filters = {};
    // Fill the filter list, if any

        let filterErrorsCaught = false;

        if (this.filters) {

      //Assign default values if any
            _.each(this.filters, (filter, key) => {
                if (!_.isUndefined(filter.default)) {
                    req.query[key] = req.query[key] || filter.default;
                }
            });
            _.each(req.query, (value, filter) => {
                if (filterErrorsCaught) return;
                if (filter === 'include') return;

                if (this.filterAlias && this.filterAlias[filter]) {
                    filter = this.filterAlias[filter];
                }

                if (this.filters[filter]) {
                    let f = this.filters[filter];

          //Replace 'me' or 'mine' with some user parameter, if user is registered
                    if (f.replaceMe && (this._replaceMe.indexOf(value) > -1)) {
                        if (req.user && req.user[f.replaceMe]) {
                            value = req.user[f.replaceMe];
                        } else {
                            this.send(res, {Error: 'You must be authorized to use \'' + filter + '=\'' + value + '\' filter'}, {code: code.AUTHENTICATION_FAILED});
                        }
                    }

                    try {
                        value = this.brest.transformator.apply(f, value);
                    } catch (err) {
                        const error = {error: err.message, code: code.VALIDATION_FAILED};
                        filterErrorsCaught = true;
                        return this._processError(error, res);
                    }
                    if (f.detach) {
                        let detachTo = filter;
                        if (_.isString(f.detach)) detachTo = f.detach;
                        if (req[detachTo]) {
                            const error = {error: `Can't detach filter "${filter}" to "${detachTo}": field already exists`, code: code.INTERNAL_SERVER_ERROR};
                            filterErrorsCaught = true;
                            return this._processError(error, res);
                        }
                        req[detachTo] = value;
                    } else {
                        req.filters[filter] = value;
                    }
                }
            });
        }

        if (filterErrorsCaught) return;

        req.include = [];
        if (req.query.include) {
            if (!_.isUndefined(this.include) && req.query['include']) {
                const include_no_spaces = req.query['include'].replace(/ /gi, '');
                const split_arr = include_no_spaces.split(',');
                if (split_arr !== null && split_arr.length > 0) {
                    _.each(split_arr, (incl) => {
                        if (!_.isUndefined(this.include[incl])) {
                            req.include.push(incl);
                        }
                    });
                }
            }
        }

        async.each(this.extensions.beforeHandler, (extension, callback) => {
            extension(this, req, callback);
        },
        (err) => {
            if (err) return this._processError(err, res);
            this.callHandler(req, res);
        });
    }


  /**
   * Check if any of the extensions have confirmed or denied user access
   * @param req
   * @param {Function} callback
   */
    checkAuth(req = required('req'), callback = required('callback')) {
        if (this.noAuth) return callback();
        async.each(this.extensions.authenticate, (extension, callback) => {
            extension(this, req, callback);
        },
      callback);
    }

  /**
   * Detach options object in case of using promises with single return value
   * @param result
   * @return {*}
   */
    static detachOptions(result = required('result')) {
        if (!result || !result.$options) {
            return {};
        }
        const options = _.clone(result.$options);
        delete result.$options;
        return options;
    }

  /**
   * Apply screening to result object.
   * @param {Object} _result
   * @private
   */
    _applyScreening(_result) {
        this.log.warn('WARNING: "screen" endpoint parameter is deprecated. Use "reject" instead'.yellow);
        const result = _.clone(_result);
        _.each(this.$fields.screen.noAuth, (key) => {
            if (_.isObject(result)) delete result[key];
            else {
                if (_.isArray(result)) {
                    _.each(result, function (elt) {
                        if (_.isObject(elt)) delete elt[key];
                    });
                }
            }
        });
        return result;
    }

  /**
   * Apply rejecting to result object
   * @param {Object} req Express.js request object
   * @param {Object} _result
   * @return {Object} result object with fields removed
   * @private
   */
    _applyRejection(req, _result) {
        const result = _.clone(_result);
        if (_.isArray(this.$fields.reject)) {
            return rejectFields(result, this.$fields.reject);
        }
        if (_.isObject(this.$fields.reject)) {
            if (_.isArray(this.$fields.reject.noAuth) && _.isEmpty(req.user)) {
                return rejectFields(result, this.$fields.reject.noAuth);
            }

            if (req.user && !_.isEmpty(req.user.roles)) {
              // _.intersection(_.keys(_.omit(this.$fields.reject, ['noAuth'])), req.user.roles);
                const affectingRoles =  _(this.$fields.reject).omit(['noAuth']).keys().intersection(req.user.roles);
                const affectingRejectors = affectingRoles.reduce((preparedRejectors, role) => _.intersection(preparedRejectors, this.$fields.reject[role]));
                return rejectFields(result, affectingRejectors);
            }
        }
        this.log.warn('Unexpected rejection parameter. Array or object expected'.yellow);
        return result;
    }

  /**
   * Process with handler results.
   * {
   *    err: error object [optional]
   *    result: handler result object [optional]
   *    options: response options [optional]
   *    req: express.js request object
   *    res: express.js result object
   * }
   * parameters have the following
   * @param {Object} parameters
   *
   */
    handlerCallback(parameters = required('parameters')) {
        parameters.options = parameters.options || {};
        let {err, result, req, res, options} = parameters;
    //Screen fields from unauthorised user, if defined by endpoint
        if (!_.isEmpty(this.$fields.screen) && _.isArray(this.$fields.screen.noAuth) && _.isEmpty(req.user)) {
            result = this._applyScreening(result);
        }
        if (!_.isEmpty(this.$fields.reject)) {
            result = this._applyRejection(req, result);
        }
        async.each(this.extensions.afterHandler, (extension, next_extension) => {
            extension(this, req, result, err, next_extension);
        }, (extension_err) => {
            const final_err = err || extension_err;
            if (final_err) return this._processError(final_err, res, false);
            this.send(res, result, options);
        });
    }

  /**
   * Process error by sending the proper error response
   * @param {*} error
   * @param {Object} res Express Result object
   * @param {boolean} [verbose] Post error to log
   * @private
   */
    _processError(error = required('error'), res = required('res'), verbose = true) {
        const err = generateReturnableError(error);
        if (verbose) {
            this.log.error(error.body);
            if (error.stack) this.log.error(error.stack);
        }
        this._brest.emit(c.EVENT_ERROR, {
            error: error
        });
        this.send(res, err.body, err.options);
    }

  /**
   * Process the request, once we get the authorisation data
   * @param {*} authError
   * @param {Object} req  Express.js request object
   * @param {Object} res  Express.js response object
   * @private
   */
    _processAuthorizedRequest(authError, req = required('req'), res = required('res')) {
        if (!authError) {

            const handlerPromise = this.handler(req, (err, result, options) => {
                return this.handlerCallback({err, result, req, res, options});
            });

            if (handlerPromise && (handlerPromise instanceof Promise || typeof handlerPromise.then === 'function')) {
                handlerPromise.then((result) => {
                    const options = Endpoint.detachOptions(result || {});
                    this.handlerCallback({result, req, res, options});
                })
          .catch((err) => {
              this.handlerCallback({err, req, res});
          });
            }
        } else {
            this._brest.emit(c.EVENT_AUTH_FAILED, {
                res: res,
                verb: this.verb
            });
            const options = {};
            if (!authError.code) {
                options.code = code.AUTHENTICATION_FAILED;
            }
            else {
                options.code = authError.code;
                delete authError.code;
            }

            this.send(res, authError, options);
        }

    }

  /**
   * Processing resource request handler
   *
   * @param {Object} req  http request object
   * @param {Object} res http response object
   */
    callHandler(req = required('req'), res = required('res')) {
        try {
      //Check authentication in async mode
            this.checkAuth(req, (authError) => this._processAuthorizedRequest(authError, req, res));
        } catch (error) {
            this._processError(error, res);
        }
    }

  /**
   * Register new extension
   * @param {Object} extension
   * @param {Function} callback
   */
    use(extension = required('extension'), callback = required('callback')) {

        async.waterfall(
            [
                (next) => {
                    if (extension.method) {
                        this.log.warn(`Extension ${extension.name || ''} uses deprecated "method" property instead of "endpoint"`.yellow);
                        extension.endpoint = extension.method;
                    }
                    if (extension.endpoint) {
                        const hooks = _.keys(this.extensions);
                        _.each(hooks, (hook) => {
                            if (_.isFunction(extension.endpoint[hook])) this.extensions[hook].push(extension.endpoint[hook]);
                        });
                        if (_.isFunction(extension.endpoint.init)) {
                            extension.endpoint.init(this, err => next(err, extension));
                        }
                        else next(null, extension);
                    } else next(null, extension);
                },
                (extension, next) => {
                    if (extension.filters) {
                        _.each(extension.filters, (filter, key) => {
                            this.addFilter(key, filter);
                        });
                    }
                    next();
                }
            ],
      callback
    );
    }

  /**
   * Create filter aliases, if necessary
   * @param {String} key
   * @param {Object} filter
   */
    checkFilterAlias(key = required('key'), filter = required('filter')) {
        if (_.isString(filter.alias)) {
            filter.alias = [filter.alias];
        }
        if (_.isArray(filter.alias)) {
            if (_.isEmpty(this.filterAlias)) this.filterAlias = {};
            _.each(filter.alias, (alias) => {
                this.filterAlias[alias] = key;
            });
        }
    }

  /**
   * Add filter by key
   * @param key
   * @param filter
   */
    addFilter(key = required('key'), filter = required('filter')) {
        if (!this.filters) this.filters = {};
        if (filter.override) {
            this.filters[key] = filter;
        } else {
            this.filters[key] = _.defaultsDeep(this.filters[key], filter);
        }
        this.checkFilterAlias(key, filter);
    }

  /**
   * Check if endpoint is enabled in current environment.
   * @param {Brest} brest
   * @param {Object} description
   * @returns {boolean}
   */
    static checkEnabled(brest = required('brest'), description = required('description')) {
    //Checking if endpoint is enabled in current environment
        let enabled = true;

        if (!_.isUndefined(description.enabled)) {
            let enabledIf = description.enabled;
            if (_.isBoolean(enabledIf)) {
                enabled = enabledIf;
            }
            else if (_.isFunction(enabledIf)) {
                enabled = enabledIf(description);
            } else {
                if (_.isString(enabledIf)) {
                    enabledIf = [enabledIf];
                }
                if (_.isArray(enabledIf)) {
                    enabled = _.reduce(enabledIf, function (current, key) {
                        return current && Boolean(brest.getSetting(key));
                    }, true);
                } else if (_.isObject(enabledIf)) {
                    enabled = _.reduce(enabledIf, function (current, value, key) {
                        return current && brest.getSetting(key) === value;
                    }, true);
                }
            }
        }

        if (!enabled) return false;

        if (!_.isUndefined(description.disabled)) {
            let disabledIf = description.disabled;
            if (_.isBoolean(disabledIf)) enabled = !disabledIf;
            else if (_.isFunction(disabledIf)) {
                enabled = !disabledIf(description);
            } else {
                if (_.isString(disabledIf)) {
                    disabledIf = [disabledIf];
                }
                if (_.isArray(disabledIf)) {
                    enabled = _.reduce(disabledIf, function (current, key) {
                        return current && !brest.getSetting(key);
                    }, true);
                } else if (_.isObject(disabledIf)) {
                    enabled = _.reduce(disabledIf, function (current, value, key) {
                        return current && !(brest.getSetting(key) === value);
                    }, true);
                }
            }
        }

        return enabled;
    }
}

module.exports = Endpoint;