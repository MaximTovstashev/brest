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
        }
    ]
};