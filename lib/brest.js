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
    multer = require('multer'),
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
     * Bind single API definition object.
     * @param description
     * @param callback
     * @returns {Brest}
     */
    self.bind = function(description, callback){
        if (!description.noun) throw new Error("Noun not provided for the resource");
        var resource = new Resource(this, description);

        //Introduce resource to the registered extensions
        async.each(self._extensions,
            function(extension, callback){
                resource.use(extension, callback);
            },
            function(err){
                if (err) callback(err);
                else {
                    self._resources[description.noun] = resource;
                    callback();
                }
            });

        return self;
    };

    /**
     * Bind single file with description
     * @param {String} fileName
     * @param {Function} callback
     * @returns {Brest}
     */
    self.bindFile = function(fileName, callback){
        var description = require(fileName);
        description.noun = path.basename(fileName, '.js');
        self.bind(description, callback);
        return this;
    };

    /**
     * Bind path to the folder with BREST resources
     * @param {String} apiPath
     * @param {Function} callback
     * @returns {Brest}
     */
    self.bindPath = function(apiPath, callback){
        fs.readdir(apiPath, function(err, resources){
            if (err) callback(err);
            else {
                async.each(resources,
                    function(resource, callback){
                        if (getFileExtension(resource)=='js') {
                            self.bindFile(path.join(apiPath,resource), callback);
                        }
                    },
                    function(err){
                        callback(err);
                    });
            }
        });

        return self;
    };

    self.use = function(extensions) {
        function proceedWithExtensions() {
            async.eachSeries(extensions, function (extension, callback) {
                self.ext(extension, callback)
            }, function (err) {
                if (err) {
                    throw err;
                } else {
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
            function(callback){
                if (_.isFunction(extension.init)){
                    extension.init(self, callback);
                } else callback();
            },

            function(callback){
                async.each(self._resources, function(resource, callback){
                    resource.use(extension, callback);
                }, function(err){
                    callback(err);
                })
            },
            function(callback){
                _.each(extension.inject, function(injection, key){
                    self[key] = injection;
                });
                callback();
            }
        ], function(err){
            if (err) {
                callback(err);
            }
            else {
                self._extensions.push(extension);
                callback();
            }
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
        var settingPath = key.split('.');
        var s = self.settings;
        _.each(settingPath, function(k){
            if (_.isUndefined(s[k])) s = defaultValue;
            else s = s[k];
        });

        return s;
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

    // Default settings
    self.settings = _.defaults(settings,{
        apiPath: path.resolve(require('path').dirname(require.main.filename),"api"),
        server: {port: '8080'}
    });

    var port = self.getSetting('server.port');

    //Setting up express
    self._app = express();
    self._app.use(morgan(this.getSetting('environment','dev')));
    self._app.use(bodyParser.json());
    self._app.use(bodyParser.urlencoded({
        extended: true
    }));

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
    http.createServer(self._app).listen(self.getSetting('server.port','8080'), function(err){
        if (err) {
            self.emit('error', err);
            console.log(err);
        } else {
            self._ready = true;
            self.emit('ready');
            console.log("\""+settings.application+"\" bREST server is now listening on port " + port +"".green);
        }

    }).on('error', function (err) {
        self.emit('error', err);
        console.log("!!!Error : <" + require('util').inspect(err, {depth:5}) + ">".red);
    });
};

inherits(Brest, EventEmitter);

module.exports = Brest;