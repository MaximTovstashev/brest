const _ = require('lodash');

const Transform = require('./basic');

class ToBooleanTransform extends Transform {

    constructor(){
        super();
        this.name = 'toBoolean';
    }

    isAppliable(filter) {
        return Transform.isBoolean(filter);
    }

    transformation(value) {
        return _.toBoolean(value);
    }

}

module.exports = ToBooleanTransform;