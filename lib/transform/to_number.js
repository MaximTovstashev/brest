const _ = require('lodash');

const Transform = require('./basic');

class ToNumberTransform extends Transform {

    constructor() {
        super();
        this.name = 'toNumber';
    }

    isAppliable(filter) {
        return filter === true;
    }

    transformation(value) {
        return _.toNumber(value);
    }

}

module.exports = ToNumberTransform;