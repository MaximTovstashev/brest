const _ = require('lodash');

const Transform = require('./basic');

class ClampTransform extends Transform {

    constructor(){
        super();
        this.name = 'max';
    }

    isAppliable(filter) {
        return Transform.isArray(filter) && filter.length == 2;
    }

    /**
     * Clamp filter between two values
     * @param {Number} value
     * @param {Number} filter_value
     * @return {number}
     */
    transformation(value, filter_value) {
        return _.clamp(value, filter_value[0], filter_value[1]);
    }

}

module.exports = ClampTransform;