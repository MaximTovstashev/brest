var _ = require('lodash'),
    async = require('async'),
    bodyParser = require('body-parser'),
    colors = require('colors'),
    EventEmitter = require('events').EventEmitter,
    express = require('express'),
    fs = require('fs'),
    http = require('http'),
    inherits = require('util').inherits,
    morgan = require('morgan'),
    path = require('path');

/**
 * Get file extension from the filename
 * @param {String} filename
 * @returns {String}
 */
function getFileExtension(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
}

var Resource = require('./resource');

/**
 * @param {Object} settings
 * @constructor
 */
var Brest = function(settings){
    var self = this;

    /**
     * Attach arbitrary variable to Brest instance
     * @param key
     * @param attachment
     */
    self.attach = function(key, attachment) {
        if (self._attachments[key]) console.log('WARNING: Already attached to: '.yellow, key);
        self._attachments[key] = attachment;
    };

    /**
     * Retrieve attached variable
     * @param key
     * @returns {*}
     */
    self.attachment = function(key) {
        if (self._attachments[key]) {
            return self._attachments[key];
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
    self.is_attached = function(key) {
        return (!_.isNull(self._attachments[key]));
    };

    /**
     * Bind single API definition object.
     * @param description
     * @param callback
     * @returns {Brest}
     */
    self.bind = function(description, callback){
        if (!description.noun) throw new Error("Noun not provided for the resource");
        var resource = new Resource(this, description);
        self._resources[description.noun] = resource;
        resource.on('ready', callback)
                .on('error', callback);
        return self;
    };

    /**
     * Bind single file with description
     * @param {String} fileName
     * @param {Function} callback
     * @returns {Brest}
     */
    self.bindFile = function(fileName, callback){
        if (_.isString(fileName)) {
            var description = require(fileName);
            description.noun = path.basename(fileName, '.js');
            self.bind(description, callback);
            return self;
        } else {
            console.log("ERROR: Can't use", fileName, "as a legit path".red);
            throw "Failed to bind file";
        }
    };

    /**
     * Bind path to the folder with BREST resources
     * @param {String} apiPath
     * @param {Function} callback
     * @returns {Brest}
     */
    self.bindPath = function(apiPath, callback){
        if (_.isArray(apiPath)) {
            async.eachSeries(apiPath, self.bindPath, function(err){
                callback(err);
            });
        } else {
            fs.readdir(apiPath, function (err, resources) {
                if (err) callback(err);
                else {
                    async.each(resources,
                        function (resource, callback) {
                            if (getFileExtension(resource) == 'js') {
                                self.bindFile(path.join(apiPath, resource), callback);
                            }
                        },
                        function (err) {
                            callback(err);
                        });
                }
            });
        }

        return self;
    };

    /**
     * Register Brest extension
     * @param extensions
     * @returns {Brest}
     */
    self.use = function(extensions) {

        if (!_.isArray(extensions)) {
            self.emit('error', 'Expected array of extension objects in Brest.use()');
            return self;
        }

        function proceedWithExtensions() {
            console.log("Initializing BREST extensions...");
            async.eachSeries(extensions, function (extension, next_extension) {
                self.ext(extension, next_extension)
            }, function (err) {
                if (err) {
                    console.log("Initializing BREST extensions failed with error".red);
                    console.log(err);
                    self.emit('error', err);
                } else {
                    console.log("Initializing BREST extensions: SUCCESS".green);
                    self.emit('extensionsLoaded');
                }
            });
        }

        if (self._ready) proceedWithExtensions();
        else self.on('ready', proceedWithExtensions);

        return self;
    };

    /**
     * Use bREST extension
     * @param {Object} extension
     * @param {Function} callback
     */
    self.ext = function(extension, callback){

        async.waterfall([
            /**
             * Check if we have init function in the extension and call it, if yes
             * @param next
             */
            function(next){
                if (_.isFunction(extension.init)){
                    extension.init(self, next);
                } else next();
            },

            /**
             * Introduce extension to registered resources
             * @param next
             */
            function(next){
                async.each(self._resources, function(resource, next_resource){
                    resource.use(extension, next_resource);
                }, next)
            },

            /**
             * Inject properties into Brest, if necessary
             * @param next
             */
            function(next){
                _.each(extension.inject, function(injection, key){
                    self[key] = injection;
                });
                next();
            }
        ], function(err){
            if (err) return callback(err);
            self._extensions.push(extension);
            callback();
        });

        return self;

    };


    /**
     * Return express.js instance
     * @returns {*}
     */
    self.getApp = function(){
        return self._app;
    };

    /**
     * Get registered extensions
     * @returns {Array}
     */
    self.getExtensions = function(){
        return self._extensions;
    };

    /**
     * Get the setting with optional defaultValue
     * @param {String} key
     * @param defaultValue
     * @returns {*}
     */
    self.getSetting = function(key, defaultValue) {
        return _.get(self.settings, key, defaultValue);
    };

    self.getPort = function() {
        return self._port;
    };

    self.close = function(callback) {
        if (!self._closing) {
            self._closing = true;
            console.log('Shutting down BREST instance'.yellow);
            self.emit('closing');
            self._server.close();
            self.on('closed', callback);
        } else {
            callback();
        }
    };

    self._emitCounterEvent = function(key, value) {
        if (self.settings.emitCounterEventOn[key] && _.indexOf(self.settings.emitCounterEventOn[key], self._counters[key]) > -1) {
            var eventData = {};
            eventData[key] = value;
            self.emit('counter', eventData);
        }
    };

    self.counterInc = function(key){
        if (!self._counters[key]) self._counters[key] = 0;
        self._emitCounterEvent(key, ++self._counters[key]);
    };

    self.counterDec = function(key) {
        if (!self._counters[key]) self._counters[key] = 0;
        self._emitCounterEvent(key, --self._counters[key]);
    };

    /**
     * CONSTRUCTOR LOGIC
     */

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

    //Starting the server
    self._server = http.createServer(self._app).listen(self._port, function(err){
        if (err) {
            self.emit('error', err);
            console.log(err);
        } else {
            self._ready = true;
            self.emit('ready');
            console.log("\""+settings.application+"\" bREST server is now listening on port " + self._port +"".green);
        }

    }).on('error', function (err) {
        self.emit('error', err);
        console.log("!!!Error : <" + require('util').inspect(err, {depth:5}) + ">".red);
    }).on('close', function(){
       console.log('BREST instance is down'.magenta);
       self.emit('closed');
    });
};

inherits(Brest, EventEmitter);

module.exports = Brest;