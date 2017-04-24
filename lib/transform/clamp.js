const _ = require('lodash');

const Transform = require('./basic');

const REQUIRED_PARAMS_COUNT = 2;

class ClampTransform extends Transform {

    constructor() {
        super();
        this.name = 'clamp';
    }

    isAppliable(filter) {
        return Transform.isArray(filter) && filter.length === REQUIRED_PARAMS_COUNT;
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