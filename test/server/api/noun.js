const basic_data = require('../../test_data').basic;

module.exports = {
    version: 1,
    noun: 'redefined',
    endpoints: [
        {
            method: 'GET',
            description: 'Simple GET request',
            handler: function (req, callback) {
                callback(null, basic_data);
            }
        }
    ]
};