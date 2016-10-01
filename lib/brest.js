const _ = require('lodash'),
    async = require('async'),
    bodyParser = require('body-parser'),
    colors = require('colors'),
    EventEmitter = require('events').EventEmitter,
    express = require('express'),
    fs = require('fs'),
    http = require('http'),
    path = require('path');

const c = require('./const');

const FilterTransformator = require('./transform');

const JS_EXTENTION = '.js';

let morgan = require('morgan');

var Resource = require('./resource');

/**
 * @param {Object} settings
 * @constructor
 */

class Brest extends EventEmitter {

    constructor(settings) {
        super();
        const self = this;
        self.__dirname = path.dirname(require.main.filename);
        if (_.isUndefined(settings)) settings = {};

        //REST resources
        self._resources = {};

        //bREST extensions
        self._extensions = [];

        //bRest attachments
        self._attachments = {};

        // Default settings
        self.settings = _.defaults(settings,{
            apiPath: path.resolve(require('path').dirname(require.main.filename),"api"),
            server: {port: '8080'},
            log: true,
            emitCounterEventOn: {}
        });

        /**
         * Initializing request counters
         * @type Object {{in: number, out: number}}
         * @private
         */
        self._counters = {};

        self._port = self.getSetting('server.port');

        //Setting up express
        self._app = express();

        //Setting up logger
        var log = self.getSetting('log');

        if (log || !_.isEmpty(log)) {
            var morganFormat = 'combined';
            var morganOptions;

            if (_.isString(log)) {
                morganFormat = log;
            }
            if (_.isObject(log)) {
                _.forEach(log, function(_morganOptions, key){
                    morganFormat = key;
                    morganOptions = _morganOptions;
                    return false;
                });
            }
            if (_.isFunction(log)) {
                morgan = log;
                self._app.use(morgan);
            } else {
                self._app.use(morgan(morganFormat, morganOptions));
            }
        }

        var urlencodedDefaults = {
            extended: true
        };
        var bodyParserSettings = self.settings.bodyParser || {
                json: null,
                urlencoded: urlencodedDefaults
            };
        bodyParserSettings.json.verify = function(req, res, buf, encoding){
            req.raw = buf.toString(encoding);
        };
        self._app.use(bodyParser.json(self.settings.bodyParser.json));
        self._app.use(bodyParser.urlencoded(self.settings.bodyParser.urlencoded || urlencodedDefaults));

        //If static is defined in settings, set static paths
        if (self.getSetting('static')){
            var s  = _.defaults(this.getSetting('static'),{
                public: 'public',
                index: 'index.html'
            });

            if (s.favicon) self._app.use(favicon(this.__dirname + s.favicon));
            self._app.use(express.static(path.join(this.__dirname, s.public || 'public')));
            self._app.get(function(req, res){
                res.render(this.getSetting('server.defaultHTML', path.join(this.__dirname, s.public, s.index)));
            }.bind(self));
        }


        //Here goes async initialization

        async.waterfall([
            function(next) {
               self.transformator = new FilterTransformator();
               self.transformator.init(next);
            },
            function(next) {
                self._server = http.createServer(self._app).listen(self._port, function(err){
                    if (err) return next(err);
                    next();
                }).on(c.EVENT_ERROR, function (err) {
                    self.emit(c.EVENT_ERROR, err);

                }).on('close', function(){
                    console.log('BREST instance is down'.magenta);
                    self.emit(c.EVENT_CLOSED);
                });
            }
        ], function(err){
            if (err) {
                console.log("!!!Error : <" + require('util').inspect(err, {depth:5}) + ">".red);
                return self.emit(c.EVENT_ERROR, err);
            }
            self._ready = true;
            self.emit(c.EVENT_READY);
            console.log("\""+settings.application+"\" bREST server is now listening on port " + self._port +"".green);
        });


    }

    /**
     * Attach arbitrary variable to Brest instance
     * @param key
     * @param attachment
     */
    attach(key, attachment) {
        const self = this;
        if (self._attachments[key]) console.log('WARNING: Already attached to: '.yellow, key);
        self._attachments[key] = attachment;
    };


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
    };

    /**
     * Check if anything is attached to the given key
     * @param key
     * @returns {boolean}
     */
    is_attached(key) {
        return (!_.isNull(this._attachments[key]));
    };

    /**
     * Bind single API definition object.
     * @param description
     * @param callback
     * @returns {Brest}
     */
    bind(description, callback){
        if (!description.noun) return callback({error: "Noun not provided for the resource"});
        const resource = new Resource(this, description);
        this._resources[description.noun] = resource;
        resource.on(c.EVENT_ERROR, callback);
        if (resource.ready) {
            callback();
        } else {
            resource.on(c.EVENT_READY, callback);
        }
    };

    /**
     * Bind single file with description
     * @param {String} fileName
     * @param {Function} callback
     * @returns {Brest}
     */
    bindFile(fileName, callback){
        if (_.isString(fileName)) {
            const description = require(fileName);
            description.noun = path.basename(fileName, JS_EXTENTION);
            this.bind(description, callback);
        } else {
            console.log("ERROR: Can't use", fileName, "as a legit path".red);
            callback({error: `ERROR: Can't use ${fileName} as a legit path`});
        }
    };

    /**
     * Bind path to the folder with BREST resources
     * @param {String} apiPath
     * @param {Function} callback
     * @returns {Brest}
     */
    bindPath(apiPath, callback){
        if (_.isArray(apiPath)) {
            async.eachSeries(apiPath, (apiPath, next)=>this.bindPath(apiPath, next), callback);
        } else {
            fs.readdir(apiPath,  (err, resources) => {
                if (err) return callback(err);
                async.each(resources,
                     (resource, next_file) => {
                        if (path.extname(resource) == JS_EXTENTION) {
                            this.bindFile(path.join(apiPath, resource), next_file);
                        }
                    },
                    callback);

            });
        }
    };


    _proceedWithExtensions(extensions) {
        console.log("Initializing BREST extensions...");
        async.eachSeries(extensions, (extension, next_extension) => {
            this.ext(extension, next_extension)
        }, (err) => {
            if (err) {
                console.log("Initializing BREST extensions failed with error".red);
                console.log(err);
                this.emit(c.EVENT_ERROR, err);
            } else {
                console.log("Initializing BREST extensions: SUCCESS".green);
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
        else this.on(c.EVENT_READY, ()=>this._proceedWithExtensions(extensions));

        return this;
    };

    /**
     * Use bREST extension
     * @param {Object} extension
     * @param {Function} callback
     */
    ext(extension, callback){

        async.waterfall([
            /**
             * Check if we have init function in the extension and call it, if yes
             * @param next
             */
            (next) => {
                if (_.isFunction(extension.init)){
                    extension.init(this, next);
                } else next();
            },

            /**
             * Introduce extension to registered resources
             * @param next
             */
            (next) => {
                async.each(this._resources, function(resource, next_resource){
                    resource.use(extension, next_resource);
                }, next)
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

    };


    /**
     * Return express.js instance
     * @returns {*}
     */
    getApp(){
        return this._app;
    };

    /**
     * Get registered extensions
     * @returns {Array}
     */
    getExtensions(){
        return this._extensions;
    };

    /**
     * Get the setting with optional defaultValue
     * @param {String} key
     * @param defaultValue
     * @returns {*}
     */
    getSetting(key, defaultValue) {
        return _.get(this.settings, key, defaultValue);
    };

    getPort() {
        return this._port;
    };

    close(callback) {
        const self = this;
        if (!self._closing) {
            self._closing = true;
            console.log('Shutting down BREST instance'.yellow);
            self.emit(c.EVENT_CLOSING);
            self._server.close();
            self.on('closed', callback);
        } else {
            callback();
        }
    };

    _emitCounterEvent(key, value) {
        const self = this;
        if (self.settings.emitCounterEventOn[key] && _.indexOf(self.settings.emitCounterEventOn[key], self._counters[key]) > -1) {
            var eventData = {};
            eventData[key] = value;
            self.emit(c.EVENT_COUNTER, eventData);
        }
    };

    counterInc(key){
        const self = this;
        if (!self._counters[key]) self._counters[key] = 0;
        self._emitCounterEvent(key, ++self._counters[key]);
    };

    counterDec(key) {
        const self = this;
        if (!self._counters[key]) self._counters[key] = 0;
        self._emitCounterEvent(key, --self._counters[key]);
    };
}

module.exports = Brest;