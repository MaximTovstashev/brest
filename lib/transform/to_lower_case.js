const Transform = require('./basic');

class ToLowerCaseTransform extends Transform {

    constructor() {
        super();
        this.name = 'toLowerCase';
    }

    isAppliable(filter) {
        return Transform.isBoolean(filter);
    }

    transformation(value) {
        return value.toString().toLowerCase();
    }

}

module.exports = ToLowerCaseTransform;