const Transform = require('./basic');

class MinTransform extends Transform {

    constructor() {
        super();
        this.name = 'min';
    }

    isAppliable(filter) {
        return Transform.isNumber(filter);
    }

  /**
   * We want to set the minimum value for the filter, so we use max(value, filter_value)
   * @param {Number} value
   * @param {Number} filter_value
   * @return {number}
   */
    transformation(value, filter_value) {
        return Math.max(value, filter_value);
    }

}

module.exports = MinTransform;