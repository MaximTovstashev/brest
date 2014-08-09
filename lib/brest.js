var _ = require('underscore'),
    bodyParser = require('body-parser'),
    express = require('express'),
    fs = require('fs'),
    http = require('http'),
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

    this.__dirname = path.dirname(require.main.filename);
    if (_.isUndefined(settings)) settings = {};

    //REST resources
    this._resources = {};

    //bREST extensions
    this._extensions = [];

    // Default settings
    this.settings = _.defaults(settings,{
        apiPath: path.resolve(require('path').dirname(require.main.filename),"api"),
        server: {port: '8080'}
    });

    if (!this.settings.server.port) this.settings.server.port = '8080';
    var port = this.settings.server.port;

    //Setting up express
    this._app = express();
    this._app.use(bodyParser.json());
    this._app.use(bodyParser.urlencoded({
        extended: true
    }));

    //If static is defined in settings, set static paths
    if (this.settings.static){
        var s  = _.defaults(this.settings.static,{
            public: 'public',
            index: 'index.html'
        });

        if (s.favicon) this._app.use(favicon(this.__dirname + s.favicon));
        this._app.use(express.static(path.join(this.__dirname, s.public || 'public')));
        this._app.get(function(req, res){
            res.render(this.settings.server.defaultHTML || path.join(this.__dirname, s.public, s.index || 'index.html'));
        }.bind(this));
    }

    //Starting the server
    http.createServer(this._app).listen(this.settings.server.port, function(err){
        if (err) console.log(err);
        console.log("\""+settings.application+"\" bREST server is now listening on port " + port);
    }).on('error', function (err) {
        console.log("!!!Error : <" + require('util').inspect(err, {depth:5}) + ">")
    });
};

//Please, note that all bREST bind functions are syncronous!

/**
 * Bind single API definition object.
 * @param description
 * @returns {Brest}
 */
Brest.prototype.bind = function(description){
    if (!description.noun) throw new Error("Noun not provided for the resource");
    var resource = new Resource(this, description);

    //Introduce resource to the registered extensions
    this._extensions.forEach(function(extension){
        resource.use(extension);
    }, this);

    this._resources[description.noun] = resource;
    return this;
};

/**
 * Bind single file with description
 * @param {String} fileName
 * @returns {Brest}
 */
Brest.prototype.bindFile = function(fileName){
    var description = require(fileName);
    description.noun = path.basename(fileName, '.js');
    this.bind(description);
    return this;
};

/**
 * Bind path to the folder with BREST resources
 * @param {String} apiPath
 * @returns {Brest}
 */
Brest.prototype.bindPath = function(apiPath){
    var resources = fs.readdirSync(apiPath);
    for (var i=0; i<resources.length; i++){
        if (getFileExtension(resources[i])=='js') {
            this.bindFile(path.join(apiPath,resources[i]));
        }
    }
    return this;
};

/**
 * Use bREST extension
 * @param {Object} extension
 */
Brest.prototype.use = function(extension){
    this._extensions.push(extension);
    if (_.isFunction(extension.init)){
        extension.init(this);
    }
    _.each(this._resources, function(resource){
        resource.use(extension);
    }, this);
};

/**
 * Return express.js instance
 * @returns {*}
 */
Brest.prototype.getApp = function(){
    return this._app;
};

/**
 * Get registered extensions
 * @returns {Array}
 */
Brest.prototype.getExtensions = function(){
    return this._extensions;
};

module.exports = Brest;