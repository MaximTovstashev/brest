const _ = require('lodash');

/**
 * Reject fields from result
 * @param result
 * @param fields
 * @return {*}
 */
function rejectFields(result, fields) {
    // If result is an array, then rejection rules are applied to each array entry
    if (_.isArray(result)) {
        return _.map(result, (single_entry) => _.omit(single_entry, fields));
    }
    return _.omit(result, fields);
}

module.exports = rejectFields;