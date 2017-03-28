const _ = require('lodash');

function rejectFields(result, fields) {
    function rejectObject(obj, fields) {
        _.each(fields, (field) => {
            _.unset(obj, field);
        });
        return obj;
    }

    if (_.isArray(result)) return _.map(result, (single_entry) => {
        return rejectObject(single_entry, fields);
    });
    if (_.isObject(result)) {
        return rejectObject(result, fields);
    }
    return result;
}

module.exports = rejectFields;