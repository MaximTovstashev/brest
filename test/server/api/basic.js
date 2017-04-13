const basic_data = require('../../test_data').basic;

module.exports = {
    version: 1,
    endpoints: [

        {
            method: 'GET',
            description: 'Simple GET request',
            handler: function (req, callback) {
                callback(null, basic_data);
            }
        },

        {
            method: 'GET',
            uri: ':id/with/:secondary_id',
            handler: function (req, callback) {
                callback(null, {id: req.params.id, secondary_id: req.params.secondary_id});
            }
        },

        {
            method: 'PUT',
            uri: ':id',
            handler: function (req, callback) {
                callback(null, {updated: req.params.id, withData: req.body});
            }
        },

        {
            method: 'POST',
            noAuth: true,
            handler: function (req, callback) {
                callback(null, {created: req.body});
            }
        },

        {
            method: 'DELETE',
            uri: ':id',
            handler: function (req, callback) {
                callback(null, {delete: req.params.id});
            }
        }

    ]
};