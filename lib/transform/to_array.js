const _ = require('lodash');

const Transform = require('./basic');

const DEFAULT_SEPARATOR = ',';

class ToArrayTransform extends Transform {

    constructor() {
        super();
        this.name = 'toArray';
    }

    isAppliable(filter) {
        return (filter === true) || Transform.isString(filter);
    }

  /**
   * Do nothing, it's already an array
   * @param value
   * @return {Array}
   */
    arrayTransformation(value) {
        return value;
    }

    transformation(value, filter_value) {
        value = _.toString(value);
        return value.split(_.isString(filter_value) ? filter_value : DEFAULT_SEPARATOR);
    }

}

module.exports = ToArrayTransform;