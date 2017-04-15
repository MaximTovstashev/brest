const basic_data = require('../../test_data').basic;

module.exports = {
    version: 1,
    endpoints: [

        {
            method: 'GET',
            description: 'Simple GET request',
            handler: function () {
                return new Promise((resolve) => {
                    resolve(basic_data);
                });
            }
        },

        {
            method: 'GET',
            uri: ':id/with/:secondary_id',
            handler: function (req) {
                return new Promise((resolve) => {
                    resolve({id: req.params.id, secondary_id: req.params.secondary_id});
                });
            }
        },

        {
            method: 'PUT',
            uri: ':id',
            handler: function (req) {
                return new Promise((resolve) => {
                    resolve({updated: req.params.id, withData: req.body});
                });
            }
        },

        {
            method: 'POST',
            handler: function (req) {
                return new Promise((resolve) => {
                    resolve({created: req.body});
                });
            }
        },

        {
            method: 'DELETE',
            uri: ':id',
            handler: function (req) {
                return new Promise((resolve) => {
                    resolve({delete: req.params.id});
                });
            }
        }

    ]
};