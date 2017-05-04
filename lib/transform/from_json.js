const Transform = require('./basic');

class FromJSONTransform extends Transform {

    constructor() {
        super();
        this.name = 'fromJSON';
    }

    isAppliable(filter) {
        return filter === true;
    }

    transformation(value) {
        return JSON.parse(value);
    }

}

module.exports = FromJSONTransform;