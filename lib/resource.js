const _ = require('lodash'),
    async = require('async'),
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
const Method = require('./method');

/**
 * HTTP method verbs
 * @type {Array}
 */
const verbs = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE'];

class Resource extends EventEmitter {

  /**
   *
   * @param brest {Brest} BREST instance
   * @param description {Object} resource description object
   * @constructor
   */
    constructor(brest, description) {
        super();

        this._brest = brest;
        this._app = brest.getApp();
        this._methods = [];
        this.description = description;
        this.ready = false;

        if (!description.noun) throw new Error('Noun not provided for the resource');
        this.noun = description.noun;

        this.version = description.version || 1;
        if (!_.isNumber(this.version) || Math.round(this.version) !== this.version || this.version < 1)
            throw new Error(`Incorrect "${description.noun}" resource version "${this.version}": only positive integers are valid`);

        if (!_.isArray(description.resources)) throw new Error(`Required "resources" array in ${description.noun} Resource`);

        this.uri = '/v' + this.version + '/' + this.noun;

        this.resourceURI = {};

        async.each(brest.getExtensions(), (extension, next) => {
            this.use(extension, next);
        }, (err) => {
            if (err) throw err;

      /**
       * Create method handlers for each resource
       */

            let methodsToInitialize = description.resources.length || 0; //Specificly set to {int}0

            const methodInitialized = () => {
                if (--methodsToInitialize === 0) {
                    this.ready = true;
                    this.emit(c.EVENT_READY);
                }
            };

            _.each(description.resources, (resource) => {
                resource.version = resource.version || this.version;

                if (!_.isNumber(resource.version) || Math.round(resource.version) !== resource.version || resource.version < 1)
                    throw new Error(`Incorrect "${description.noun}" resource version "${resource.version}": only positive integers are valid`);

                resource.noun = description.noun;

                if (Method.checkEnabled(brest, resource)) {
                    const method = new Method(brest, resource);

                    method
            .on(c.EVENT_ERROR, (err) => {
                this.emit(c.EVENT_ERROR, err);
            });

                    const uri = method.getURI();
                    const verb = method.getVerb();

                    if (_.isUndefined(this.resourceURI[uri])) this.resourceURI[uri] = {};
                    if (this.resourceURI[uri][verb]) throw new Error(`Duplicate verb ${verb} for ${uri}`);

                    this.resourceURI[uri][verb] = method;
                    this._methods.push(method);

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
            _.each(this.resourceURI, (resourse, uri) => {
                const usedMethods = _.keys(resourse);
                const strayMethods = _.difference(verbs, usedMethods);

                for (let i = 0; i < strayMethods.length; i++) {
                    this._app[strayMethods[i].toLowerCase()](uri, this.createStrayMethod(usedMethods.join()));
                }
            }, this);
        });
    }

  /**
   * Create stray method (used, when method is not supported by given URI)
   * @param supportedString
   * @returns {Function}
   */
    createStrayMethod(supportedString) {
        return (req, res) => {
            res.statusCode = ec.METHOD_NOT_SUPPORTED;
            res.setHeader('Allow', supportedString);
            res.send();
        };
    }

  /**
   * Register new extension in the methods
   * @param extension
   * @param callback
   */
    use(extension, callback) {

        async.waterfall([
            (next) => {
                if (extension.resource && _.isFunction(extension.resource.init)) {
                    extension.resource.init(this, next);
                } else next(null, extension);
            },

            (extension, next) => {
                async.each(this._methods, (method, callback) => {
                    method.use(extension, callback);
                }, next);
            }
        ], callback);
    }

  /**
   * Get resource base URI
   * @returns {string|*}
   */
    getURI() {
        return this.uri;
    }

  /**
   * Get Brest instance
   * @returns {Brest|*}
   */
    getBrest() {
        return this._brest;
    }

}

module.exports = Resource;