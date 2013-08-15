/**
 * @author Maxim Tovstashev <max.kitsch@gmail.com>
 */

/**
 * Error codes
 * @type {Object}
 */
var ec = require('./error_codes.js');

/**
 * HTTP method verbs
 * @type {Array}
 */
var verbs = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH", "TRACE"];

/**
 * API resources
 * @type {Object}
 */
var APIres = {};

/**
 * Underscore object
 * @type {Object}
 */
var _ = require("underscore");

/**
 * JaySchema validator object
 * @type {JaySchema}
 */
var JaySchema = require('jayschema');

/**
 * JaySchema validator instance
 * @type {JaySchema}
 */
var js;

/**
 *
 * @param {Object} res http result object
 * @param {*} data result data
 * @param {Number} code HTTP code
 */
function send(res,data,code){
    if (_.isUndefined(code)) code = 200;
    if (_.isObject(data)){
        res.json(data,code);
    }
    else {
        res.send(data,code);
    }
}

/**
 * Processing resource request handler
 *
 * @param {Object} req  http request object
 * @param {Object} res http response object
 * @param {Object} rd resource data
 */
function callHandler(req, res, rd){
    if (rd.noAuth || (req.user)){
        rd.handler(req, function(err,data){
            if (err){
                var code = ec.INTERNAL_SERVER_ERROR;
                if (_.isString(err)) err = {message: err};
                if (_.isNumber(err.code)) {
                    code = err.code;
                    delete err.code;
                }
                send(res,err,code);
            } else {
                send(res,data);
            }
        });
    } else {
        send(res,{gatekeeper:"You must be authorized to use this method"},ec.AUTHENTICATION_FAILED);
    }
}

var schemaURL = 'local://ref/';

/**
 * Initialize api with settings
 *
 * @param settings
 */
module.exports.init = function(settings){
    if (settings && settings.schemaLoader) {
        // If loader with given name already defined within JaySchema, we load it
        if (JaySchema.loaders[settings.schemaLoader]) js = new JaySchema(JaySchema.loaders[settings.schemaLoader]);
        // Otherwise we treat it as a require path
        else js = new JaySchema(require(settings.schemaLoader));
    } //Finally, if nothing is set, we use our own loader
    else {
        var loader = require('./schema_loader.js');
        loader.init(settings);
        js = new JaySchema(loader.handler);
    }

    if (settings && settings.schemaURL) {
        schemaURL = settings.schemaURL;
    }
};

/**
 * Add resources for the given noun
 *
 * @param {Object} app
 * @param {String} noun
 * @param {Object} r
 * @returns {boolean}
 */
module.exports.bind = function(app, noun, r){
    if (!_.isString(noun))
        throw {message: "Noun is not a string in API description", code: ec.INTERNAL_SERVER_ERROR};
    if (!_.isNumber(r.version) || Math.round(r.version) != r.version || r.version<1)
        throw {message: "Incorrect \""+noun+"\" resource version \"" + r.version + "\": only positive integers are valid", code: ec.INTERNAL_SERVER_ERROR};

    for (var i = 0; i < r.resources.length; i++){

        var rd = r.resources[i];
        if (_.isUndefined(rd.uri)) rd.uri = "";

        if (!_.isString(rd.uri))
            throw {message: "Uri is not a string in \""+noun+"\" resource description", code: ec.INTERNAL_SERVER_ERROR};
        if (verbs.indexOf(rd.method.toUpperCase()) == -1)
            throw {message: "Invalid HTTP method \""+rd.method.toUpperCase()+"\" in \""+noun+"\" resource description", code: ec.INTERNAL_SERVER_ERROR};

        rd.method = rd.method.toUpperCase();

        var debugURI = "\""+rd.method+" /v" + r.version + "/" + noun + "/" + rd.uri+"\"";

        if (!_.isUndefined(rd.schema)){
            if (!_.isString(rd.schema))
                throw {message: "Schema name must be a string for " + debugURI, code: ec.INTERNAL_SERVER_ERROR};
        }

        if (_.isUndefined(rd.validator)) rd.validator = function() {};

        if (!_.isFunction(rd.validator))
            throw {message: "Validator must be a function for "+ debugURI, code: ec.INTERNAL_SERVER_ERROR};
        if (!_.isFunction(rd.handler) && !rd.stub)
            throw {message: "Handler must be a function for "+ debugURI, code: ec.INTERNAL_SERVER_ERROR};

        var resource = {
            uri: "/v" + r.version + "/" + noun + (rd.uri?"/" + rd.uri:""),
            method: rd.method,
            middle: rd.middle,
            noAuth: rd.noAuth,
            handler: function(rd){

                return function(req, res){

                    // If method is stub, we do nothing, despite any other method properties.
                    if (rd.stub) {
                        send(res, {Stub: "Not implemented yet!"});
                        return;
                    }


                    req.filters = {};

                    // Fill the filter list, if any
                    _.each(req.query,function(value, filter){
                        if (rd.filters && rd.filters[filter]){
                            if (_.isUndefined(req.filters)) req.filters = {};
                            req.filters[filter] = value;
                        }
                    });

                    /**
                     * Validate the query.
                     *
                     * Custom validator can send custom validation errors. Express validator should not
                     * return anything from "validate" method
                     */
                    var validationResult = rd.validator(req);
                    if (!_.isUndefined(validationResult)) {
                        send(res, validationResult, ec.VALIDATION_FAILED);
                        return;
                    }

                    /**
                     * Check for express-validator errors.
                     *
                     * @type {Object}
                     */
                    var errors = req.validationErrors();
                    if (errors) {
                        send(res, errors, ec.VALIDATION_FAILED);
                        return;
                    }

//                            try {
                    if (!_.isUndefined(rd.schema)){
                        js.validate(req.body,schemaURL+rd.schema, function(error){
                            if (error) send(res, error, ec.VALIDATION_FAILED);
                            else {
                                callHandler(req,res,rd);
                            }
                        });
                    } else {
                        callHandler(req,res,rd);
                    }
//                            } catch(e) { //TODO parse error
//                                send(res, e.toString(),ec.INTERNAL_SERVER_ERROR);
//                            }
                }}(rd)
        };

        if (_.isUndefined(APIres[resource.uri])) APIres[resource.uri] = {};
        if (!_.isUndefined(APIres[resource.uri][resource.method]))
            throw {message: "Duplicate method "+rd.method+" for "+debugURI, code: ec.INTERNAL_SERVER_ERROR};

        APIres[resource.uri][resource.method] = resource;
        if (!_.isUndefined(resource.middle)){
            app[resource.method.toLowerCase()](resource.uri,resource.middle, resource.handler);
        } else {
            app[resource.method.toLowerCase()](resource.uri,resource.handler);
        }


    }

    _.each(APIres,function(resourse,uri){
        var usedMethods = _.keys(resourse);
        var strayMethods = _.difference(verbs, usedMethods);

        var errHandler = function(req,res){
            res.statusCode = ec.METHOD_NOT_SUPPORTED;
            res.setHeader('Allow', usedMethods.join());
            res.send();
        };

        for (var i=0; i < strayMethods.length; i++){
            app[strayMethods[i].toLowerCase()](uri,errHandler);
        }
    });

    return true;
};