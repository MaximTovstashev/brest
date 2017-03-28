const Transform = require('./basic');

class ToUpperCaseTransform extends Transform {

    constructor() {
        super();
        this.name = 'toUpperCase';
    }

    isAppliable(filter) {
        return Transform.isBoolean(filter);
    }

    transformation(value) {
        return value.toUpperCase();
    }

}

module.exports = ToUpperCaseTransform;