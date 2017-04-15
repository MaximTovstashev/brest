function required(parameter_name = '') {
    throw new Error(`Missing required function parameter ${parameter_name}`);
}

module.exports = required;