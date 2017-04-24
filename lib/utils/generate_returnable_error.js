const _ = require('lodash');
// eslint-disable-next-line no-unused-vars
const log = require('intel').getLogger('brest.utils.generate_returnable_error');

const httpCodes = require('../http_codes');

/**
 * Generate proper returnable object according to received error type
 * @param {*} error
 * @return {Object}
 */
function generateReturnableError(error) {
    if (_.isError(error)) {
        return {
            body: {error: error.message},
            options: {code: httpCodes.INTERNAL_SERVER_ERROR}
        };
    }
    if (_.isString(error)) {
        return {
            body: {error},
            options: {code: httpCodes.INTERNAL_SERVER_ERROR}
        };
    }
    if (_.isObject(error) && !_.isFunction(error)) {
        if (_.isArray(error)) {
            return {
                body: {error},
                options: {code: httpCodes.INTERNAL_SERVER_ERROR}
            };
        }
        let code = error.code || httpCodes.INTERNAL_SERVER_ERROR;
        delete error.code;
        return {
            body: error,
            options: {code}
        };
    }
    if (_.isFunction(error)) {
        return {
            body: {error: 'Incorrect error type "function"'},
            options: {code: httpCodes.INTERNAL_SERVER_ERROR}
        };
    }
    return {
        body: {error: 'Unexpected error format'},
        options: {code: httpCodes.INTERNAL_SERVER_ERROR}
    };
}

module.exports = generateReturnableError;