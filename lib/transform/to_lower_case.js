const Transform = require('./basic');

class ToLowerCaseTransform extends Transform {

  constructor() {
    super();
    this.name = 'toLowerCase';
  }

  isAppliable(filter) {
    return Transform.isBoolean(filter);
  }

  transformation(value) {
    return value.toLowerCase();
  }

}

module.exports = ToLowerCaseTransform;