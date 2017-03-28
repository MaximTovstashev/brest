const _ = require('lodash');

const Transform = require('./basic');

class CustomTransform extends Transform {

    constructor() {
        super();
        this.name = 'transform';
    }

    isAppliable(filter) {
        return Transform.isFunction(filter);
    }

  /**
   * Apply function provided in filter value
   * @param {Number} value
   * @param {Function} filter_value
   * @return {*}
   */
    transformation(value, filter_value) {
        return filter_value(value);
    }

}

module.exports = CustomTransform;