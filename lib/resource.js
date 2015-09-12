var _ = require("lodash"),
    async = require("async");

/**
 * Error codes
 * @type {Object}
 */
var ec = require('./error_codes.js');

/**
 * Method object
 * @type {Method|exports}
 */
var Method = require('./method');

/**
 * HTTP method verbs
 * @type {Array}
 */
var verbs = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH", "TRACE"];

/**
 *
 * @param brest {Brest} BREST instance
 * @param description {Object} resource description object
 * @constructor
 */
var Resource = function(brest, description){
    this._brest = brest;
    this._app = brest.getApp();
    this._extensions = brest.getExtensions();
    this._methods = [];

    if (!description.noun) throw new Error("Noun not provided for the resource");

    this.version = description.version || 1;
    if (!_.isNumber(this.version) || Math.round(this.version) != this.version || this.version<1)
        throw new Error("Incorrect \""+description.noun+"\" resource version \"" + this.version + "\": only positive integers are valid");

    if (!_.isArray(description.resources)) throw new Error("Required \"resources\" array in "+description.noun+" Resource");

    this.resourceURI = {};

    /**
     * Create method handlers for each resource
     */
    _.each(description.resources, function(resource){
        resource.version = resource.version || this.version;

        if (!_.isNumber(resource.version) || Math.round(resource.version) != resource.version || resource.version<1)
            throw new Error ("Incorrect \""+description.noun+"\" resource version \"" + resource.version + "\": only positive integers are valid");

        resource.noun = description.noun;

        var method = new Method(brest, resource);
        var uri = method.getURI();
        var verb = method.getMethod();

        if (_.isUndefined(this.resourceURI[uri])) this.resourceURI[uri] = {};
        if (this.resourceURI[uri][verb]) throw new Error("Duplicate verb "+verb+" for "+uri);

        this.resourceURI[uri][verb] = method;
        this._methods.push(method);
    }, this);

    /**
     * Create default handlers for unused VERBs for each URI
     */
    _.each(this.resourceURI, function(resourse, uri){
        var usedMethods = _.keys(resourse);
        var strayMethods = _.difference(verbs, usedMethods);

        for (var i=0; i < strayMethods.length; i++){
            this._app[strayMethods[i].toLowerCase()](uri, this.createStrayMethod(usedMethods.join()));
        }
    }, this);
};

/**
 * Create stray method (used, when method is not supported by given URI)
 * @param supportedString
 * @returns {Function}
 */
Resource.prototype.createStrayMethod = function(supportedString){
    return function(req, res){
        res.statusCode = ec.METHOD_NOT_SUPPORTED;
        res.setHeader('Allow', supportedString);
        res.send();
    };
};

/**
 * Register new extension in the methods
 * @param extension
 * @param callback
 */
Resource.prototype.use = function(extension, callback){
    async.each(this._methods, function(method, callback){
        method.use(extension, callback);
    }, callback);
};

module.exports = Resource;