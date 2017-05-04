const _ = require('lodash');

class Transform {

    constructor() {
        this.name = 'basic';
    }

  /**
   * Util for string check
   * @param val
   * @return {*}
   */
    static isString(val) {
        return _.isString(val);
    }

  /**
   * Util for number check
   * @param val
   * @return {*}
   */
    static isNumber(val) {
        return _.isNumber(val);
    }

  /**
   * Util for array check
   * @param val
   * @return {*|boolean}
   */
    static isArray(val) {
        return _.isArray(val);
    }

  /**
   * Util for function check
   * @param val
   * @return {*}
   */
    static isFunction(val) {
        return _.isFunction(val);
    }

  /**
   * Override this method to check if custom transform is appliable
   * @param filter
   * @return {boolean}
   */
// eslint-disable-next-line no-unused-vars
    isAppliable(filter) {
        return false;
    }

  /**
   * Override this method for custom transformation
   * @param value
   * @param filter_value
   * @return {*}
   */
// eslint-disable-next-line no-unused-vars
    transformation(value, filter_value) {
        return value;
    }

  /**
   * Override if you require custom array transformation (see toArray)
   * @param {Array} value
   * @param {*} filter_value
   * @return {Array}
   */
    arrayTransformation(value, filter_value) {
        return _.map(value, (entry) => this.transformation(entry, filter_value));
    }

  /**
   * Though it is not encouraged, this method can be overriden to make even more specific transformations
   * @param {Object} filter_params
   * @param {*} value
   * @return {*}
   */
    apply(filter_params, value) {
        const filter = filter_params[this.name];
        if (this.isAppliable(filter)) {
            if (_.isArray(value)) {
                value = this.arrayTransformation(value, filter);
            } else {
                value = this.transformation(value, filter);
            }
        }
        return value;
    }

}

module.exports = Transform;