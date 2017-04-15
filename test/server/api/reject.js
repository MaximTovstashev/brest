const returning_object = {
    user: 'john.doe',
    email: 'john.doe@example.com',
    password: '*********',
    secret: 'Help me! I\'m trapped in Factory Pattern!'
};

const returning_object2 = {
    user: 'jane.doe',
    email: 'jane.doe@example.com',
    hue: 'violet',
    password: '*********',
    secret: 'Help me! I\'m trapped in Factory Pattern!'
};

const returning_array = [returning_object, returning_object2];

module.exports = {
    description: 'Testing filters',
    endpoints: [
        {
            method: 'GET',
            reject: ['password', 'secret'],
            description: 'Check basic reject functionality',
            handler(req, callback) {
                callback(null, returning_object);
            }
        },
        {
            method: 'GET',
            uri: 'array',
            reject: ['password', 'secret'],
            description: 'Check reject from array',
            handler(req, callback) {
                callback(null, returning_array);
            }
        }
    ]
};