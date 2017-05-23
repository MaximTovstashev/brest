const _ = require('lodash'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter;

/**
 * Error codes
 * @type {Object}
 */
const ec = require('./http_codes.js'),
    c = require('./const');

const intel = require('intel');

/**
 * Endpoint object
 * @type {Endpoint}
 */
const Endpoint = require('./endpoint');

/**
 * HTTP method verbs
 * @type {Array}
 */
const verbs = [c.VERB_GET, c.VERB_POST, c.VERB_PUT, c.VERB_DELETE, c.VERB_PATCH, c.VERB_OPTIONS, c.VERB_HEAD, c.VERB_TRACE];

class Resource extends EventEmitter {

    get endpoints() {
        return this._endpoints;
    }

    get uri() {
        return this.resourceURI;
    }

  /**
   *
   * @param brest {Brest} BREST instance
   * @param description {Object} resource description object
   * @constructor
   */
    constructor(brest, description) {
        super();

        this._endpoints = [];
        this.description = description;
        this.ready = false;

        if (!description.noun) throw new Error('Noun not provided for the resource');
        this.noun = description.noun;

        intel.config(brest.getSetting('intel') || {});
        this.log = intel.getLogger(`brest.${this.noun}`);


        this.version = description.version || 1;
        if (!_.isNumber(this.version) || Math.round(this.version) !== this.version || this.version < 1)
            throw new Error(`Incorrect "${description.noun}" resource version "${this.version}": only positive integers are valid`);

        if (description.resources) {
            this.log.warn('WARNING: deprecated "resources" API description property. Use "endpoints" instead'.yellow);
            description.endpoints = description.resources;
        }

        if (!_.isArray(description.endpoints)) throw new Error(`Required "endpoints" array in ${description.noun} Resource`);

        this.resourceURI = {};

        async.each(brest.extensions, (extension, next) => {
            this.use(extension, next);
        }, (err) => {
            if (err) throw err;

      /**
       * Create method handlers for each endpoint
       */

            let endpointsToInitialize = description.endpoints.length || 0; //Specifically set to {int}0

            const endpointInitialized = () => {
                if (--endpointsToInitialize === 0) {
                    this.ready = true;
                    this.emit(c.EVENT_READY);
                }
            };

            _.each(description.endpoints, (endpoint_description) => {
                endpoint_description.version = endpoint_description.version || this.version;

                if (!_.isNumber(endpoint_description.version) || Math.round(endpoint_description.version) !== endpoint_description.version || endpoint_description.version < 1)
                    throw new Error(`Incorrect "${description.noun}" resource version "${endpoint_description.version}": only positive integers are valid`);

                endpoint_description.noun = description.noun;

                if (Endpoint.checkEnabled(brest, endpoint_description)) {
                    const endpoint = new Endpoint(brest, endpoint_description);

                    endpoint
            .on(c.EVENT_ERROR, (err) => {
                this.emit(c.EVENT_ERROR, err);
            });

                    const uri = endpoint.uri;
                    const verb = endpoint.verb;

                    if (_.isUndefined(this.resourceURI[uri])) this.resourceURI[uri] = {};
                    if (this.resourceURI[uri][verb]) throw new Error(`Duplicate verb ${verb} for ${uri}`);

                    this.resourceURI[uri][verb] = endpoint;
                    this._endpoints.push(endpoint);

                    if (!endpoint.ready) {
                        endpoint.on(c.EVENT_READY, endpointInitialized);
                    } else {
                        endpointInitialized();
                    }
                } else {
                    endpointInitialized();
                }
            });

      /**
       * Create default handlers for unused VERBs for each URI
       */
            _.each(this.resourceURI, (resourse, uri) => {
                const used_verbs = _.keys(resourse);
                const unused_verbs = _.difference(verbs, used_verbs);

                const strayVerbEndpoint = this._createUnusedVerbEndpoint(used_verbs.join());
                unused_verbs.forEach((stray_verb) => {
                    brest.app[stray_verb.toLowerCase()](uri, strayVerbEndpoint);
                });
            });
        });
    }

  /**
   * Create stray verb (used, when HTTP Method is not supported by given URI)
   * @private
   * @param supportedString
   * @returns {Function}
   */
    _createUnusedVerbEndpoint(supportedString) {
        return (req, res) => {
            res.statusCode = ec.METHOD_NOT_SUPPORTED;
            res.setHeader('Allow', supportedString);
            res.send();
        };
    }

  /**
   * Register new extension in the endpoints
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
                async.each(this.endpoints, (endpoint, callback) => {
                    endpoint.use(extension, callback);
                }, next);
            }
        ], callback);
    }

}

module.exports = Resource;