const Transform = require('./basic');

class MaxTransform extends Transform {

    constructor() {
        super();
        this.name = 'max';
    }

    isAppliable(filter) {
        return Transform.isNumber(filter);
    }

  /**
   * We want to set the maximum value for the filter, so we use min(value, filter_value)
   * @param {Number} value
   * @param {Number} filter_value
   * @return {number}
   */
    transformation(value, filter_value) {
        return Math.min(value, filter_value);
    }

}

module.exports = MaxTransform;