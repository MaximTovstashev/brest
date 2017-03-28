const _ = require('lodash');

const Transform = require('./basic');

class ToIntegerTransform extends Transform {

    constructor() {
        super();
        this.name = 'toInteger';
    }

    isAppliable(filter) {
        return Transform.isBoolean(filter);
    }

    transformation(value) {
        return _.toInteger(value);
    }

}

module.exports = ToIntegerTransform;