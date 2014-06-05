var _ = require('underscore'),
    fs = require('fs'),
    path = require('path');

var API = require('./api.js');

var Brest = function(settings){
    this.extensions = [];
    this.injections = {
        beforeHandler: [],
        validateGet: [],
        validatePost: []
    };

    if (_.isUndefined(settings)) settings = {};

    settings = _.defaults(settings,{
        apiPath: fs.realpathSync(path.resolve(require('path').dirname(require.main.filename),"api")),
        schemaURL: "local://ref/",
        schemaPath: fs.realpathSync(path.resolve(require('path').dirname(require.main.filename),"schema"))
    });
};

Brest.prototype.use = function(brestExtension){

    Object.keys(brestExtension.getInjections()).forEach(function(injectionName){
        if (typeof brestExtension[injectionName]=='function'){
            this.injections[injectionName].push(brestExtension[injectionName]);
        }
    });

    this.ext[]

    return this;
};

Brest.prototype.bind = function(apiDefinition){
  return this;
};

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
