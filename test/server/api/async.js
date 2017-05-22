const MOCK_ASYNC_DELAY = 200;
const basic_data = require('../../test_data').basic;

const resource = {
    version: 1,
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

module.exports = {
    description: 'Check async Resource creation',
    async: function(callback) {
        setTimeout(()=>{
            callback(null, resource);
        }, MOCK_ASYNC_DELAY);
    }
};