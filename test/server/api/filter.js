module.exports = {
    description: 'Testing filters',
    endpoints: [
        {
            method: 'GET',
            uri: 'basic',
            filters: {
                'foo': 'Basic filter named "foo"',
                'bar': 'Basic filter named "bar"',
            },
            description: 'Check basic filters functionality',
            handler(req, callback) {
                callback(null, {filters: req.filters});
            }
        },
        {
            method: 'GET',
            uri: 'limiters',
            filters: {
                ceil: {max: 10},
                floor: {min: 10},
                between: {clamp: [10, 20]},

            },
            description: 'Check basic filters functionality',
            handler(req, callback) {
                callback(null, {filters: req.filters});
            }
        },
        {
            method: 'GET',
            uri: 'json',
            filters: {
                query: {fromJSON: true}
            },
            description: 'Check basic filters functionality',
            handler(req, callback) {
                callback(null, {filters: req.filters});
            }
        },
        {
            method: 'GET',
            uri: 'detach/correct',
            filters: {
                standalone: {detach: true},
                rename: {detach: 'rabbits'}
            },
            description: 'Check filters detach',
            handler(req, callback) {
                callback(null, {filters: req.filters, standalone: req.standalone, rename: req.rename, rabbits: req.rabbits});
            }
        },
        {
            method: 'GET',
            uri: 'detach/incorrect',
            filters: {
                crashme: {detach: 'filters'}
            },
            description: 'Check incorrect detach error',
            handler(req, callback) {
                callback(null, {filters: req.filters});
            }
        }
    ]
};