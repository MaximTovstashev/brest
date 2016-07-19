var _ = require("lodash"),
    async = require("async"),
    EventEmitter = require('events').EventEmitter;

/**
 * Error codes
 * @type {Object}
 */
const ec = require('./http_codes.js'),
      c = require('./const');

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

class Resource extends EventEmitter {

    /**
     *
     * @param brest {Brest} BREST instance
     * @param description {Object} resource description object
     * @constructor
     */
    constructor (brest, description) {
        super();
        const self = this;

        self._brest = brest;
        self._app = brest.getApp();
        self._methods = [];
        self.description = description;
        self.ready = false;

        if (!description.noun) throw new Error("Noun not provided for the resource");
        self.noun = description.noun;

        self.version = description.version || 1;
        if (!_.isNumber(self.version) || Math.round(self.version) != self.version || self.version < 1)
            throw new Error("Incorrect \""+description.noun+"\" resource version \"" + self.version + "\": only positive integers are valid");

        if (!_.isArray(description.resources)) throw new Error("Required \"resources\" array in "+description.noun+" Resource");

        self.uri = "/v" + self.version + "/" + self.noun;

        self.resourceURI = {};

        async.each(brest.getExtensions(), function(extension, next){
            self.use(extension, next);
        }, function(err){
            if (err) throw err;

            /**
             * Create method handlers for each resource
             */

            var methodsToInitialize = description.resources.length;

            function methodInitialized() {
                if (--methodsToInitialize == 0) {
                    self.ready = true;
                    self.emit(c.EVENT_READY);
                }
            }

            _.each(description.resources, function(resource){
                resource.version = resource.version || self.version;

                if (!_.isNumber(resource.version) || Math.round(resource.version) != resource.version || resource.version<1)
                    throw new Error ("Incorrect \""+description.noun+"\" resource version \"" + resource.version + "\": only positive integers are valid");

                resource.noun = description.noun;

                if (Method.checkEnabled(brest, resource)) {
                    var method = new Method(brest, resource);

                    method
                        .on(c.EVENT_ERROR, function (err) {
                            self.emit(c.EVENT_ERROR, err);
                        });

                    var uri = method.getURI();
                    var verb = method.getVerb();

                    if (_.isUndefined(self.resourceURI[uri])) self.resourceURI[uri] = {};
                    if (self.resourceURI[uri][verb]) throw new Error("Duplicate verb " + verb + " for " + uri);

                    self.resourceURI[uri][verb] = method;
                    self._methods.push(method);

                    if (!method.ready) {
                        method.on(c.EVENT_READY, methodInitialized);
                    } else {
                        methodInitialized();
                    }
                } else {
                    methodInitialized();
                }
            });

            /**
             * Create default handlers for unused VERBs for each URI
             */
            _.each(self.resourceURI, function(resourse, uri){
                var usedMethods = _.keys(resourse);
                var strayMethods = _.difference(verbs, usedMethods);

                for (var i=0; i < strayMethods.length; i++){
                    self._app[strayMethods[i].toLowerCase()](uri, self.createStrayMethod(usedMethods.join()));
                }
            }, self);
        });
    }

    /**
     * Create stray method (used, when method is not supported by given URI)
     * @param supportedString
     * @returns {Function}
     */
    createStrayMethod(supportedString) {
        return function (req, res) {
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
    use(extension, callback){
        const self = this;

        async.waterfall([
            function (next) {
                if (extension.resource && _.isFunction(extension.resource.init)) {
                    extension.resource.init(self, next);
                } else next(null, extension)
            },

            function(extension, next) {
                async.each(self._methods, function(method, callback) {
                    method.use(extension, callback);
                }, next);
            }
        ], callback);
    };

    /**
     * Get resource base URI
     * @returns {string|*}
     */
    getURI() {
        return this.uri;
    };

    /**
     * Get Brest instance
     * @returns {Brest|*}
     */
    getBrest() {
        return this._brest;
    };

}

module.exports = Resource;