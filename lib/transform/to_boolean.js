const _ = require('lodash');

const Transform = require('./basic');

class ToBooleanTransform extends Transform {

    constructor() {
        super();
        this.name = 'toBoolean';
    }

    isAppliable(filter) {
        return filter === true;
    }

    transformation(value) {
        return (_.isString(value) && (value.toLowerCase() === 'false' || value === '0')) ? false : Boolean(value);
    }

}

module.exports = ToBooleanTransform;