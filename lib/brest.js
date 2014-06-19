var _ = require('underscore'),
    bodyParser = require('body-parser'),
    express = require('express'),
    expressValidator = require('express-validator'),
    fs = require('fs'),
    path = require('path');

/**
 * Error codes
 * @type {Object}
 */
var ec = require('./schema_loader');
var Resource = require('./resource');

/**
 * HTTP method verbs
 * @type {Array}
 */
var verbs = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH", "TRACE"];

/**
 * @param settings
 * @constructor
 */
var Brest = function(settings){

    this.__dirname = path.dirname(require.main.filename);

    this.extensions = [];
    this.injections = {
        beforeHandler: [],
        validateGet: [],
        validatePost: []
    };
    if (_.isUndefined(settings)) settings = {};

    this._resources = {};

    // Default settings
    this.settings = _.defaults(settings,{
        apiPath: fs.realpathSync(path.resolve(require('path').dirname(require.main.filename),"api")),
        schemaURL: "local://ref/",
        schemaPath: fs.realpathSync(path.resolve(require('path').dirname(require.main.filename),"schema"))
    });

    //Setting up API
    this.__api = {};

    //Setting up express
    this._app = express();

    this._app.use(bodyParser());

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
        });
    }

    //Starting the server
    http.createServer(app).listen(app.get('port'), function(err){
        if (err) console.log(err);
        console.log(settings.application+" server listening on port " + app.get('port'));
    }).on('error', function (err) {
        console.log("!!!Error : <" + require('util').inspect(err, {depth:5}) + ">")
    });
};

/**
 * Use Brest extension
 *
 * @param brestExtension
 * @returns {Brest}
 */
Brest.prototype.use = function(brestExtension){

    Object.keys(brestExtension.getInjections()).forEach(function(injectionName){
        if (typeof brestExtension[injectionName]=='function'){
            this.injections[injectionName].push(brestExtension[injectionName]);
        }
    });

    this.extensions.push(brestExtension(this));
    return this;
};

/**
 * Bind single API definition object
 * @param description
 * @returns {Brest}
 */
Brest.prototype.bind = function(description){
  if (!description.noun) throw {message: 'Noun not provided for the resource'};
  this._resources[description.noun] = Resource(this._app, description);
  return this;
};

module.exports = Brest;

module.exports = function (app, settings) {

    var resources = fs.readdirSync(settings.apiPath);

    API.init(settings);

    for (i=0; i<resources.length; i++)
    {
        var resource = resources[i];

        try {
            if (resource.indexOf(".js")==resource.length-3)
                API.bind(app, resource.substring(0,resource.length-3), require(path.join(settings.apiPath,resource)));
        } catch (e){
            console.log("Failed to initialize API resource",resource,e);
        }
    }
};
