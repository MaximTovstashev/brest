const mocha     = require('mocha');
const chai      = require('chai');
const chaiHttp  = require('chai-http');

chai.use(chaiHttp);

module.exports.mocha = mocha;
module.exports.chai = chai;
module.exports.should = chai.should();
module.exports.assert = chai.assert;
module.exports.request = chai.request;