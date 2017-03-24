/* eslint-disable indent,no-mixed-spaces-and-tabs,no-mixed-spaces-and-tabs */
const _ = require('lodash'),
  async = require('async'),
  bodyParser = require('body-parser'),
  EventEmitter = require('events').EventEmitter,
  express = require('express'),
  fs = require('fs'),
  http = require('http'),
  path = require('path');

require('colors');

const c = require('./const');

const FilterTransformator = require('./transform');

const JS_EXTENTION = '.js';

const DEFAULT_PUBLIC_DIR = 'public';

let morgan = require('morgan');

const Resource = require('./resource');

/**
 * @param {Object} settings
 * @constructor
 */

class Brest extends EventEmitter {

  constructor(settings) {
    super();

    this.__dirname = path.dirname(require.main.filename);
    if (_.isUndefined(settings)) settings = {};

    //REST resources
    this._resources = {};

    //bREST extensions
    this._extensions = [];

    //bRest attachments
    this._attachments = {};

    // Default settings
    this.settings = _.defaults(settings, {
      apiPath: path.resolve(require('path').dirname(require.main.filename), 'api'),
      server: {port: '8080'},
      log: true,
      emitCounterEventOn: {}
    });

    /**
     * Initializing request counters
     * @type Object {{in: number, out: number}}
     * @private
     */
    this._counters = {};

    this._port = this.getSetting('server.port');

    //Setting up express
    this._app = express();

    //Setting up logger
    const log = this.getSetting('log');

    if (log || !_.isEmpty(log)) {
      let morganFormat = 'combined';
      let morganOptions;

      if (_.isString(log)) {
        morganFormat = log;
      }
      if (_.isObject(log)) {
        _.forEach(log, (_morganOptions, key) => {
          morganFormat = key;
          morganOptions = _morganOptions;
          return false;
        });
      }
      if (_.isFunction(log)) {
        morgan = log;
        this._app.use(morgan);
      } else {
        this._app.use(morgan(morganFormat, morganOptions));
      }
    }

    const urlencodedDefaults = {
      extended: true
    };
    const bodyParserSettings = this.settings.bodyParser || {
        json: null,
        urlencoded: urlencodedDefaults
      };
    bodyParserSettings.json.verify = (req, res, buf, encoding) => {
      req.raw = buf.toString(encoding);
    };
    this._app.use(bodyParser.json(this.settings.bodyParser.json));
    this._app.use(bodyParser.urlencoded(this.settings.bodyParser.urlencoded || urlencodedDefaults));

    if (_.isFunction(this.getSetting(c.EVENT_BEFORE_STATIC_INIT))) {
      this.getSetting(c.EVENT_BEFORE_STATIC_INIT)(express, this.getApp());
    }

    //If static is defined in settings, set static paths
    if (this.getSetting('static')) {
      const s = _.defaults(this.getSetting('static'), {
        public: DEFAULT_PUBLIC_DIR,
        index: 'index.html'
      });

      if (s.favicon) this._app.use(favicon(this.__dirname + s.favicon));
      this._app.use(express.static(path.join(this.__dirname, s.public || DEFAULT_PUBLIC_DIR)));
      this._app.get((req, res) => {
        res.render(this.getSetting('server.defaultHTML', path.join(this.__dirname, s.public, s.index)));
      });
    }

    if (_.isFunction(this.getSetting(c.EVENT_AFTER_STATIC_INIT))) {
      this.getSetting(c.EVENT_AFTER_STATIC_INIT)(express, this.getApp());
    }


    //Here goes async initialization

    async.waterfall([
      (next) => {
        this.transformator = new FilterTransformator();
        this.transformator.init(next);
      },
      (next) => {
        this._server = http.createServer(this._app).listen(this._port, (err) => {
          if (err) return next(err);
          next();
        }).on(c.EVENT_ERROR, (err) => {
          this.emit(c.EVENT_ERROR, err);

        }).on('close', () => {
          console.log('BREST instance is down'.magenta);
          this.emit(c.EVENT_CLOSED);
        });
      }
    ], (err) => {
      if (err) {
        console.log('!!!Error : <' + require('util').inspect(err, {depth: 5}) + '>'.red);
        return this.emit(c.EVENT_ERROR, err);
      }
      this._ready = true;
      this.emit(c.EVENT_READY);
      console.log('"' + settings.application + '" bREST server is now listening on port ' + this._port + ''.green);
    });


  }

  /**
   * Attach arbitrary variable to Brest instance
   * @param key
   * @param attachment
   */
  attach(key, attachment) {
    if (this._attachments[key]) console.log('WARNING: Already attached to: '.yellow, key);
    this._attachments[key] = attachment;
  }


  /**
   * Retrieve attached variable
   * @param key
   * @returns {*}
   */
  attachment(key) {
    if (this._attachments[key]) {
      return this._attachments[key];
    }
    else {
      console.log('ERROR: Attachment not found: '.red, key);
    }
  }

  /**
   * Check if anything is attached to the given key
   * @param key
   * @returns {boolean}
   */
  is_attached(key) {
    return (!_.isNull(this._attachments[key]));
  }

  /**
   * Bind single API definition object.
   * @param description
   * @param callback
   * @returns {Brest}
   */
  bind(description, callback) {
    if (!description.noun) return callback({error: 'Noun not provided for the resource'});
    const resource = new Resource(this, description);
    this._resources[description.noun] = resource;
    resource.on(c.EVENT_ERROR, callback);
    if (resource.ready) {
      callback();
    } else {
      resource.on(c.EVENT_READY, callback);
    }
  }

  /**
   * Bind single file with description
   * @param {String} fileName
   * @param {Function} callback
   * @returns {Brest}
   */
  bindFile(fileName, callback) {
    if (_.isString(fileName)) {
      const description = require(fileName);
      description.noun = path.basename(fileName, JS_EXTENTION);
      this.bind(description, callback);
    } else {
      console.log('ERROR: Can\'t use', fileName, 'as a legit path'.red);
      callback({error: `ERROR: Can't use ${fileName} as a legit path`});
    }
  }

  /**
   * Bind path to the folder with BREST resources
   * @param {String} apiPath
   * @param {Function} callback
   * @param {Boolean} [suppressEventEmission]
   * @returns {Brest}
   */
  bindPath(apiPath, callback, suppressEventEmission = false) {
    if (!suppressEventEmission) this.emit(c.EVENT_BEFORE_API_INIT, express, this.getApp());
    if (_.isArray(apiPath)) {
      async.eachSeries(apiPath, (apiPath, next) => this.bindPath(apiPath, next), callback, true);
    } else {
      fs.readdir(apiPath, (err, resources) => {
        if (err) return callback(err);
        async.each(resources, (resource, next_file) => {
            if (path.extname(resource) === JS_EXTENTION) {
              this.bindFile(path.join(apiPath, resource), next_file);
            }
          },
          (err) => {
            if (err) return callback(err);
            if (!suppressEventEmission) this.emit(c.EVENT_AFTER_API_INIT, express, this.getApp());
          });
      });
    }
  }


  _proceedWithExtensions(extensions) {
    console.log('Initializing BREST extensions...');
    async.eachSeries(extensions, (extension, next_extension) => {
      this.ext(extension, next_extension);
    }, (err) => {
      if (err) {
        console.log('Initializing BREST extensions failed with error'.red);
        console.log(err);
        this.emit(c.EVENT_ERROR, err);
      } else {
        console.log('Initializing BREST extensions: SUCCESS'.green);
        this.emit(c.EVENT_EXT_LOADED);
      }
    });
  }


  /**
   * Register Brest extension
   * @param extensions
   * @returns {Brest}
   */
  use(extensions) {
    if (!_.isArray(extensions)) {
      this.emit(c.EVENT_ERROR, 'Expected array of extension objects in Brest.use()');
      return this;
    }
    if (this._ready) this._proceedWithExtensions(extensions);
    else this.on(c.EVENT_READY, () => this._proceedWithExtensions(extensions));

    return this;
  }

  /**
   * Use bREST extension
   * @param {Object} extension
   * @param {Function} callback
   */
  ext(extension, callback) {

    async.waterfall([
      /**
       * Check if we have init function in the extension and call it, if yes
       * @param next
       */
        (next) => {
        if (_.isFunction(extension.init)) {
          extension.init(this, next);
        } else next();
      },

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
   * @returns {*}
   */
  getApp() {
    return this._app;
  }

  /**
   * Get registered extensions
   * @returns {Array}
   */
  getExtensions() {
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

  getPort() {
    return this._port;
  }

  close(callback) {
    if (!this._closing) {
      this._closing = true;
      console.log('Shutting down BREST instance'.yellow);
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

  counterInc(key) {
    if (!this._counters[key]) this._counters[key] = 0;
    this._emitCounterEvent(key, ++this._counters[key]);
  }

  counterDec(key) {
    if (!this._counters[key]) this._counters[key] = 0;
    this._emitCounterEvent(key, --this._counters[key]);
  }
}

module.exports = Brest;