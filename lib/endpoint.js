'use strict';

const _ = require('lodash'),
    async = require('async'),
    cors = require('cors'),
    EventEmitter = require('events').EventEmitter;

const intel = require('intel');
let logger;

/**
 * Error codes
 * @type {Object}
 */
const code = require('./http_codes.js'),
    c = require('./const.js'),
    rejectFields = require('./utils/reject_fields');

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

    get app()     {return this._app;}
    get brest()   {return this._brest;}
    get fields()  {return this.$fields;}
    get verb()    {return this._verb;}
    get uri()     {return this._uri;}

  /**
   *
   * @param {Brest} brest Brest instance
   * @param description
   * @constructor
   */
    constructor(brest, description) {
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

        if (!_.isString(description.noun)) throw new Error('Noun is missing in the description');

        intel.config(brest.getSetting('intel') || {});
        logger = intel.getLogger(`brest.${description.noun}.endpoint`);

        const api_url = [];
        if (this.brest.getSetting('api_url.prefix')) api_url.push(this._brest.getSetting('api_url.prefix'));
        if (!this.brest.getSetting('api_url.unversioned')) api_url.push(`v${description.version}`);
        api_url.push(description.noun);
        if (description.uri) api_url.push(description.uri);

        const uri = '/' + api_url.join('/');

        _.each(description, (property, key) => {
            this[fieldsReplacement[key] || key] = property;
        });

        if (!_.isFunction(this.handler)) this.handler = emptyHandler;
        if (!_.isArray(description.middle)) {
            if (_.isFunction(description.middle)) {
                description.middle = [description.middle];
            } else {
                if (description.middle) logger.warn(('WARNING: description.middle is set, but is neither array nor function for ' + description.noun + '/' + description.uri).yellow);
                description.middle = [];
            }
        }

        _.each(description.filters, (filter, key) => {
            this.checkFilterAlias(key, filter);
        });

        if (brest.getSetting('toobusy.enabled', false)) {
            description.middle.push(require('./middleware/toobusy')(this.brest));
        }

    //Kick in cors middleware
        if (description.allowCORS) {
            description.middle.push(cors({optionsSuccessStatus: code.HTTP_OK}));

      //Enable pre-flight "OPTIONS" request support
            if (this.verb.toLowerCase() !== 'get') {
                this.app.options(uri, cors({optionsSuccessStatus: code.HTTP_OK}));
            }
        }

        if (description.upload) {
            description.middle.push(require('./middleware/multer')(description));
        }

        require('./middleware/bodyparser')(this.brest, description);

        async.each(brest.extensions, (extension, next) => {
            this.use(extension, next);
        }, (err) => {
            if (err) throw err;
      //Register endpoint in express
            this._uri = uri;
            this.app[this.verb.toLowerCase()](uri, description.middle, this.onRequest.bind(this));
            this.ready = true;
            this.emit(c.EVENT_READY);
        });
    }

    getErrorCodes() {
        return code;
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
    send(res, data, options) {

        if (!data) data = {brest: 'ok'}; //Express seems to crash on empty return
        if (!options) options = {};
        if (!options.code) options.code = code.HTTP_OK;
        if (options.headers) res.set(options.headers);

        if (options.cookies) _.each(options.cookies, (cookie) => {
            res.cookie(cookie.name, cookie.value, cookie.options);
        });

        if (_.isObject(data) && !options.ignoreJSON) {
            if (options.file) {
                res.download(options.file, options.fileName, (err) => {
                    if (options.fileCallback) options.fileCallback(err);
                    else {
                        if (err) logger.error(err);
                    }
                });
                return;
            }
            if (options.redirect) {
                res.redirect(options.redirect);
                return;
            }
            res.status(options.code).json(data);
            this.brest.counterInc(c.COUNTER_OUT);
            this.brest.counterDec(c.COUNTER_PROCESS);
        }
        else {
            res.status(options.code).send(data);
            this.brest.counterInc(c.COUNTER_OUT);
            this.brest.counterDec(c.COUNTER_PROCESS);
        }
    }

  /**
   * Get endpoint uri
   * @deprecated
   * @returns {string}
   */
    getURI() {
        logger.warn('WARNING: Deprecated function Endpoint.getURI() use Endpoint.uri instead'.yellow);
        return this._uri;
    }

  /**
   * Get endpoint verb
   * @deprecated
   * @returns {string}
   */
    getVerb() {
        logger.warn('WARNING: Deprecated function Endpoint.getVerb() use Endpoint.verb instead'.yellow);
        return this._verb;
    }

  /**
   * Get single description field by key
   * @param key
   * @returns {*}
   */
    getField(key) {
        return this.$fields[key];
    }

    getFields() {
        logger.warn('WARNING: Deprecated function Endpoint.getFields() use Endpoint.fields instead'.yellow);
        return this.$fields;
    }

  /**
   * Get Brest instance
   * @deprecated
   * @returns {Brest|*}
   */
    getBrest() {
        logger.warn('WARNING: Deprecated function Endpoint.getBrest() use Endpoint.brest instead'.yellow);
        return this._brest;
    }

  /**
   * Proceed with request and call handler
   * @param req
   * @param res
   * @returns {Endpoint}
   */
    onRequest(req, res) {

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
            logger.warn(`WARNING: ${deprecated_message}`);
        }

        req.filters = {};
    // Fill the filter list, if any
        if (this.filters) {
      //Assign default values if any
            _.each(this.filters, (filter, key) => {
                if (!_.isUndefined(filter.default)) {
                    req.query[key] = req.query[key] || filter.default;
                }
            });
            _.each(req.query, (value, filter) => {
                if (filter === 'include') {
                    return;
          //this does not break. _.each will always run
          //the iterator function for the entire array
          //return value from the iterator is ignored
                }
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

                    value = this.brest.transformator.apply(f, value);
                    req.filters[filter] = value;
                }
            });
        }

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

        async.each(this._extensions.beforeHandler, (extension, callback) => {
            extension(this, req, callback);
        },
      (err) => {
          if (err) {
              logger.error('ERROR IN ENDPOINT:', err);
              let errBody = {};
              let errCode = code.INTERNAL_SERVER_ERROR;
              if (err.body) errBody = err.body;
              else errBody = err;
              if (err.code) errCode = err.code;
              this.send(res, errBody, {code: errCode});
          } else {
              this.callHandler(req, res);
          }
      });
    }


  /**
   * Check if any of the extensions have confirmed or denied user access
   * @param req
   * @param {Function} callback
   */
    checkAuth(req, callback) {
        if (this.noAuth) return callback();
        async.each(this._extensions.authenticate, (extension, callback) => {
            extension(this, req, callback);
        },
      (err) => {
          callback(err);
      });
    }

  /**
   * Detach options object in case of using promises with single return value
   * @param result
   * @return {*}
   */
    static detachOptions(result) {
        const options = _.clone(result.$options);
        delete result.$options;
        return options;
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
    handlerCallback(parameters) {
        parameters.options = parameters.options || {};
        let {err, result, req, res, options} = parameters;
        if (!_.isEmpty(err)) this._brest.emit(c.EVENT_ERROR, {error: err});

    //Screen fields from unauthorised user, if defined by endpoint
        if (!_.isEmpty(this.$fields.screen)
              && _.isArray(this.$fields.screen.noAuth)
              && _.isEmpty(req.user)) {

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
        }
        if (!_.isEmpty(this.$fields.reject)) {
            if (_.isArray(this.$fields.reject)) {
                result = rejectFields(result, this.$fields.reject);
            }
            if (_.isObject(this.$fields.reject)) {
                if (_.isArray(this.$fields.reject.noAuth) && _.isEmpty(req.user)) {
                    result = rejectFields(result, this.$fields.reject.noAuth);
                }
            }
            if (req.user && !_.isEmpty(req.user.roles)) {
                const affectingRoles = _.intersection(_.keys(_.omit(this.$fields.reject, ['noAuth'])), req.user.roles);
                _.each(affectingRoles, (role) => {
                    result = rejectFields(result, this.$fields.reject[role]);
                });
            }
        }

        if (err) {
            if (_.isString(err)) err = {error: err};
            if (_.isNumber(err.code)) {
                options.code = err.code;
                delete err.code;
            } else {
                options.code = code.INTERNAL_SERVER_ERROR;
            }
            this.send(res, err, options);
        } else {
            this.send(res, result, options);
        }
    }

  /**
   * Process the request, once we get the authorisation data
   * @param {*} authError
   * @param {Object} req  Express.js request object
   * @param {Object} res  Express.js response object
   */
    processAuthorizedRequest(authError, req, res) {
        if (!authError) {

            const handlerPromise = this.handler(req, (err, result, options) => this.handlerCallback({err, result, req, res, options}));

            if (handlerPromise && (handlerPromise instanceof Promise || typeof handlerPromise.then === 'function')) {
                handlerPromise.then((result)=>{
                    const options = Endpoint.detachOptions(result);
                    this.handlerCallback({result, req, res, options});
                })
                .catch((err)=>{
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
    callHandler(req, res) {
        try {
      //Check authentication in async mode
            this.checkAuth(req, (authError) => this.processAuthorizedRequest(authError, req, res));
        } catch (error) {
            this._brest.emit(c.EVENT_ERROR, {
                error: error,
                stack: error.stack
            });
            logger.error(error);
            logger.error(error.stack);
            this.send(res, error, {code: code.INTERNAL_SERVER_ERROR});
        }
    }

  /**
   * Register new extension
   * @param {Object} extension
   * @param {Function} callback
   */
    use(extension, callback) {

        async.waterfall(
            [
                (next) => {
                    if (extension.method) {
                        logger.warn('Extension uses deprecated "method" property instead of "endpoint"'.yellow);
                        extension.endpoint = extension.method;
                    }
                    if (extension.endpoint) {
                        const keys = _.keys(this._extensions);
                        _.each(keys, (key) => {
                            if (_.isFunction(extension.endpoint[key])) this._extensions[key].push(extension.endpoint[key]);
                        });
                        if (_.isFunction(extension.endpoint.init)) {
                            extension.endpoint.init(this, next);
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

    checkFilterAlias(key, filter) {
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
    addFilter(key, filter) {
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
    static checkEnabled(brest, description) {
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