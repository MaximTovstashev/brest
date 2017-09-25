/* eslint-disable indent,no-mixed-spaces-and-tabs,no-mixed-spaces-and-tabs */
const _ = require('lodash'),
  async = require('async'),
  EventEmitter = require('events').EventEmitter,
  express = require('express'),
  fs = require('fs'),
  http = require('http'),
  path = require('path');

require('colors');

const c = require('./const');

const FilterTransformator = require('./transform');
const required = require('./utils/reqired');

const JS_EXTENTION = '.js';
const DEFAULT_PUBLIC_DIR = 'public';

const intel = require('intel');
let log;

let morgan = require('morgan');

const Resource = require('./resource');

/**
 * @param {Object} settings
 * @constructor
 */
class Brest extends EventEmitter {

  get app() {
    return this._app;
  }

  get express() {
    return this._express;
  }

  get extensions() {
    return this._extensions;
  }

  get port() {
    return this._port;
  }

  get resources() {
    return this._resources;
  }

  /**
   * Constructor function
   * @param parameters
   * @param extensions
   */
  constructor(parameters = {}, extensions = []) {
    super();

    async.waterfall([
      (next) => {
        this.__dirname = parameters.basePath || path.dirname(require.main.filename);

        //REST resources
        this._resources = {};

        //bREST extensions
        this._extensions = extensions;

        //bRest attachments
        this._attachments = {};

        // Default parameters
        this.settings = _.defaults(parameters, {
          apiPath: path.resolve(require('path').dirname(require.main.filename), 'api'),
          server: {port: '8080'},
          log: true,
          emitCounterEventOn: {}
        });

        intel.config(this.getSetting('intel') || {});
        log = intel.getLogger('brest.main');

        log.info('Logging is up. Initializing Express application');
        /**
         * Initializing request counters
         * @type Object {{in: number, out: number}}
         * @private
         */
        this._counters = {};

        this._port = this.getSetting('server.port');

        this._express = parameters.express || express;
        this._app = parameters.app || this._express();

        require('./middleware/bodyparser').initGlobal(this);
        next();
      },

      //CHECKPOINT: Before Static init
      (next) => {
        this._checkpoint(c.EVENT_BEFORE_STATIC_INIT, next);
      },
      (next) => {
        //Setting up logger
        const requestLogger = this.getSetting('log');

        if (requestLogger || !_.isEmpty(requestLogger)) {
          let morganFormat = 'combined';
          let morganOptions;

          if (_.isString(requestLogger)) {
            morganFormat = requestLogger;
          }
          if (_.isObject(requestLogger)) {
            _.forEach(requestLogger, (_morganOptions, key) => {
              morganFormat = key;
              morganOptions = _morganOptions;
              return false;
            });
          }
          if (_.isFunction(requestLogger)) {
            morgan = requestLogger;
            this.app.use(morgan);
          } else {
            this.app.use(morgan(morganFormat, morganOptions));
          }
        }

        log.info('Initializing static server');

        //If static is defined in parameters, set static paths
        if (this.getSetting('static')) {
          const static_settings = _.defaults(this.getSetting('static'), {
            public: DEFAULT_PUBLIC_DIR,
            index: 'index.html'
          });

          if (static_settings.favicon) this.app.use(static_settings.favicon(this.__dirname + static_settings.favicon));
          const static_path = static_settings.public || DEFAULT_PUBLIC_DIR;

          fs.access(static_path, fs.constants.R_OK, (err) => {
              if (err) log.warn(`Provided ${static_path} doesn't seem to exist or be readable`);

              if (static_settings.mountPath) {
                  this.app.use(static_settings.mountPath, this.express.static(static_path));
              } else {
                  this.app.use(this.express.static(static_path));
              }

              this.app.get((req, res) => {
                  res.render(this.getSetting('server.defaultHTML', path.join(this.__dirname, static_settings.public, static_settings.index)));
              });

              next();
          });
          return;
        }
        next();
      },

      //CHECKPOINT: Before API Init
      (next) => {
        this._checkpoint(c.EVENT_BEFORE_API_INIT, next);
      },
      (next) => {
        this.transformator = new FilterTransformator();
        this.transformator.init(next);
      },
      //Binding API routes
      (next) => {
        if (this.getSetting('apiPath')) {
          return this.bindPath(this.getSetting('apiPath'), next, this.getSetting('suppressEventsForSettingsAPI', false));
        } else {
          return next();
        }
      },

      (next) => {
        this._server = http.createServer(this.app).listen(this._port, (err) => {
          if (err) return next(err);
          next();
        }).on(c.EVENT_ERROR, (err) => {
          this.emit(c.EVENT_ERROR, err);
        }).on('close', () => {
          log.info('Brest instance is down'.magenta);
          this.emit(c.EVENT_CLOSED);
        });
      },

      (next) => {
        this._ready = true;
        this.emit(c.EVENT_READY);
        const server_name = parameters.application || 'Unnamed';
        log.info(`${server_name} server is now listening on port ${this._port}`.green);
        next();
      },

      //CHECKPOINT: Ready
      (next) => {
        this._checkpoint(c.EVENT_READY, next);
      },

      //Finalizing extension initialization
      (next) => {
        this._proceedWithExtensions(next);
      }

    ], (err) => {
      if (err) {
        log.error('!!!Error : <' + require('util').inspect(err, {depth: 5}) + '>'.red);
        return this.emit(c.EVENT_ERROR, err);
      }
    });

    this.on('error', (err) => {
      log.error(err);
    });
  }

  _extensionHook(hook, callback) {
    if (_.isArray(this.extensions)) {
      async.eachSeries(this.extensions, (extension, next_extension) => {
        if (_.isFunction(extension[hook])) {
          extension[hook](this, next_extension);
        } else {
          next_extension();
        }
      }, callback);
    } else {
      log.warn('Expected extensions parameter to be array');
      callback();
    }
  }

  /**
   * Process checkpoint interruption function and extension hooks
   * @param name
   * @param callback
   * @private
   */
  _checkpoint(name, callback) {
    log.info('Checkpoint:', name);
    async.waterfall([
      (next) => {
        const checkpoint = this.getSetting(`checkpoint.${name}`);
        if (_.isFunction(checkpoint)) {
          checkpoint(this, next);
        } else next();
      },
      (next) => {
        this._extensionHook(name, next);
      }
    ], (err) => {
      if (err) return callback(err);
      log.info(`Checkpoint ${name} passed`.green);
      callback();
    });
  }

  /**
   * Attach arbitrary variable to Brest instance
   * @param key
   * @param attachment
   */
  attach(key = required('key'), attachment = required('attachment')) {
    if (this._attachments[key]) log.warn(`WARNING: Already attached to: ${key}`.yellow);
    this._attachments[key] = attachment;
  }


  /**
   * Retrieve attached variable
   * @param key
   * @returns {*}
   */
  attachment(key = required('key')) {
    if (this._attachments[key]) {
      return this._attachments[key];
    }
    else {
      log.error(`ERROR: Attachment not found: ${key}`.red);
    }
  }

  /**
   * Check if anything is attached to the given key
   * @param key
   * @returns {boolean}
   */
  is_attached(key = required('key')) {
    return (!_.isNull(this._attachments[key]));
  }

  _bind(description = required(description), callback = required(callback)) {
    const resource = new Resource(this, description);

    this._resources[description.noun] = resource;
    resource.on(c.EVENT_ERROR, callback);
    if (resource.ready) return callback();
    resource.on(c.EVENT_READY, callback);
  }

  /**
   * Bind single API definition object.
   * @param description
   * @param callback
   * @returns {Brest}
   */
  bind(description = required(description), callback = required(callback)) {
    if (!description.noun) return callback({error: 'Noun not provided for the resource'});

    if (description.async) {
      if (!_.isFunction(description.async)) return callback({error: 'Expected resource async definition to be function'});
      description.async((err, description_data) => {
        if (err) return callback(err);
        if (_.isEmpty(description_data)) return callback({error: `Retrieved empty async description for ${description.noun}`});
        description_data.noun = description_data.noun || description.noun;
        this._bind(description_data, callback);
      });
    } else {
      this._bind(description, callback);
    }
  }

  /**
   * Bind single file with description
   * @param {String} fileName
   * @param {Function} callback
   * @returns {Brest}
   */
  bindFile(fileName = required('filename'), callback = required('callback')) {
    if (_.isString(fileName)) {
      const description = require(fileName);
      description.noun = description.noun || path.basename(fileName, JS_EXTENTION);
      this.bind(description, callback);
    } else {
      log.error(`Can't use ${fileName} as a legit path`.red);
      callback({error: `Can't use ${fileName} as a legit path`});
    }
  }

  /**
   * Bind path to the folder with Brest resources
   * @param {String} apiPath
   * @param {Function} callback
   * @param {Boolean} [suppressEventEmission]
   * @returns {Brest}
   */
  bindPath(apiPath = required('apiPath'), callback = required('callback'), suppressEventEmission = false) {

    if (!suppressEventEmission) this.emit(c.EVENT_BEFORE_API_INIT, this.express, this.app);

    if (_.isArray(apiPath)) {

      async.eachSeries(apiPath,
        (apiPath, next) => this.bindPath(apiPath, next, true),

        (err) => {
          if (err) return callback(err);
          if (!suppressEventEmission) this.emit(c.EVENT_AFTER_API_INIT, this.express, this.app);
          callback();
        });

    } else {

      fs.readdir(apiPath, (err, resources) => {

        if (err) {
          log.error('Failed to read path', apiPath);
          return callback(err);
        }

        async.each(resources,

          (resource, next_file) => {
            if (path.extname(resource) === JS_EXTENTION) {
              return this.bindFile(path.join(apiPath, resource), (err)=>{
                if (err) log.error(err);
                next_file();
              });
            }
            next_file();
          },

          (err) => {
            if (err) return callback(err);
            if (!suppressEventEmission) this.emit(c.EVENT_AFTER_API_INIT, this.express, this.app);
            callback();
          });
      });
    }
  }


  /**
   * Register Brest extensions
   * @param {Function} callback
   * @private
   */
  _proceedWithExtensions(callback) {
    log.info('Initializing Brest extensions...');
    async.eachSeries(this.extensions, (extension, next_extension) => {
      this.ext(extension, next_extension);
    }, (err) => {
      if (err) {
        log.error('Initializing Brest extensions failed with error'.red);
        callback(err);
      } else {
        log.info('Initializing Brest extensions: SUCCESS'.green);
        this.emit(c.EVENT_EXT_LOADED);
        callback();
      }
    });
  }

  /**
   * Use bREST extension
   * @param {Object} extension
   * @param {Function} callback
   */
  ext(extension, callback) {

    async.waterfall([
      /**
       * Introduce extension to registered resources
       * @param next
       */
        (next) => {
        async.each(this._resources, (resource, next_resource) => {
          resource.use(extension, next_resource);
        }, next);
      },

      /**
       * Inject properties into Brest, if necessary
       * @param next
       */
        (next) => {
        _.each(extension.inject, (injection, key) => {
          this[key] = injection;
        });
        next();
      }
    ], (err) => {
      if (err) return callback(err);
      this._extensions.push(extension);
      callback();
    });

  }


  /**
   * Return express.js instance
   * @deprecated
   * @returns {*}
   */
  getApp() {
    log.warn('WARNING: Deprecated function Brest.getApp() use Brest.app instead'.yellow);
    return this._app;
  }

  /**
   * Get registered extensions
   * @deprecated
   * @returns {Array}
   */
  getExtensions() {
    log.warn('WARNING: Deprecated function Brest.getExtensions() use Brest.extensions instead'.yellow);
    return this._extensions;
  }

  /**
   * Get the setting with optional defaultValue
   * @param {String} key
   * @param defaultValue
   * @returns {*}
   */
  getSetting(key, defaultValue) {
    return _.get(this.settings, key, defaultValue);
  }

  /**
   * @deprecated
   * @return {*}
   */
  getPort() {
    log.warn('WARNING: Deprecated function Brest.getPort() use Brest.port instead'.yellow);
    return this._port;
  }

  /**
   * Shut down Brest
   * @param callback
   */
  close(callback) {
    if (!this._closing) {
      this._closing = true;
      log.info('Shutting down Brest instance'.yellow);
      this.emit(c.EVENT_CLOSING);
      this._server.close();
      this.on('closed', callback);
    } else {
      callback();
    }
  }

  _emitCounterEvent(key, value) {
    if (this.settings.emitCounterEventOn[key] && _.indexOf(this.settings.emitCounterEventOn[key], this._counters[key]) > -1) {
      const eventData = {};
      eventData[key] = value;
      this.emit(c.EVENT_COUNTER, eventData);
    }
  }

  /**
   * Increase Brest inner counter by key and emit counter event
   * @param {String} key
   */
  counterInc(key) {
    if (!this._counters[key]) this._counters[key] = 0;
    this._emitCounterEvent(key, ++this._counters[key]);
  }

  /**
   * Decrease Brest inner counter by key and emit counter event
   * @param {String} key
   */
  counterDec(key) {
    if (!this._counters[key]) this._counters[key] = 0;
    this._emitCounterEvent(key, --this._counters[key]);
  }
}

module.exports = Brest;