const _ = require('lodash');

const Transform = require('./basic');

class ToFiniteTransform extends Transform {

    constructor() {
        super();
        this.name = 'toFinite';
    }

    isAppliable(filter) {
        return Transform.isBoolean(filter);
    }

    transformation(value) {
        return _.toFinite(value);
    }

}

module.exports = ToFiniteTransform;