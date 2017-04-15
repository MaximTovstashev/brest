module.exports = {
    endpoints: [
        {
            method: 'GET',
            description: 'Get basic error',
            handler(req, callback) {
                callback({error: 'Test error'});
            }
        },

        {
            method: 'GET',
            uri: 'promise',
            description: 'Get basic error from promise',
            handler() {
                return new Promise((resolve, reject) => {
                    reject({error: 'Test error reject'});
                });
            }
        },

        {
            method: 'GET',
            uri: 'code',
            description: 'Get basic error with code',
            handler(req, callback) {
                callback({error: 'Test error with 400', code: 400});
            }
        },

        {
            method: 'GET',
            uri: 'promise/code',
            description: 'Get basic error from promise',
            handler() {
                return new Promise((resolve, reject) => {
                    reject({error: 'Test error reject with 400', code: 400});
                });
            }
        }
    ]
};