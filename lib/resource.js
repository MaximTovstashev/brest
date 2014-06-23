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
 * @param app {Object} express.js instance
 * @param description {Object} resource description object
 * @constructor
 */
var Resource = function(app, description){
    this._app = app;
    this._extensions = [];

    if (!description.noun) throw {message: 'Noun not provided for the resource'};

    this.version = description.version || 1;
    if (!_.isNumber(this.version) || Math.round(this.version) != this.version || resource.version<1)
        throw {message: "Incorrect \""+description.noun+"\" resource version \"" + this.version + "\": only positive integers are valid"};

    if (!_.isArray(description.resources)) throw {message: 'Required "resources" array in '+description.noun+' Resource'};

    this.resourceURI = {};

    /**
     * Create method handlers for each resource
     */
    _.each(description.resources, function(resource){
        resource.version = resource.version || this.version;
        if (!_.isNumber(resource.version) || Math.round(resource.version) != resource.version || resource.version<1)
            throw {message: "Incorrect \""+noun+"\" resource version \"" + resource.version + "\": only positive integers are valid"};

        var method = Method(this._app, resource);
        var uri = method.getURI();
        var verb = method.getMethod();

        if (_.isUndefined(this.resourceURI[uri])) this.resourceURI[uri] = {};
        if (this.resourceURI[uri][verb]) throw {message: "Duplicate verb "+verb+" for "+uri};

        this.resourceURI[uri][verb] = method;
    });

    /**
     * Create default handlers for unused VERBs for each URI
     */
    _.each(this.resourceURI, function(resourse, uri){
        var usedMethods = _.keys(resourse);
        var strayMethods = _.difference(verbs, usedMethods);

        var errHandler = function(req, res){
            res.statusCode = ec.METHOD_NOT_SUPPORTED;
            res.setHeader('Allow', usedMethods.join());
            res.send();
        };

        for (var i=0; i < strayMethods.length; i++){
            this._app[strayMethods[i].toLowerCase()](uri,errHandler);
        }
    });
};

Resource.prototype.use = function(brestExtension){
    if (_.isFunction(brestExtension.registerResource)) {
        brestExtension.registerResource(this);
    }
    this._extensions.push(brestExtension);
    return this;
};