const async = require('async');

class FilterTransformator {

    constructor() {
    /**
     * @type {Transform[]}
     */
        this.transformators = [];
        this.order = [
            'to_array',
            'from_json',
            'to_lower_case', 'to_upper_case',
            'to_number', 'to_integer',
            'to_boolean',
            'min', 'max', 'clamp',
            'custom'
        ];
    }

    init(callback) {
        async.each(this.order,
      (filename, next_file) => {
          const TransformClass = require('./transform/' + filename);
          this.transformators.push(new TransformClass());
          next_file();
      }, callback);
    }

    apply(filter, value) {
        for (const transformator of this.transformators) {
            value = transformator.apply(filter, value);
        }
        return value;
    }

}

module.exports = FilterTransformator;