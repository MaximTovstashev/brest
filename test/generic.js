const mocha = require('mocha');
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSpies = require('chai-spies');

chai.use(chaiHttp);
chai.use(chaiSpies);

let brest;

function initSpyGenerator(_brest) {
    brest = _brest;
}

function getSpy(event = 'error', emitter = brest) {
    const spy = new chai.spy();
    emitter.on(event, spy);
    return spy;
}

module.exports.mocha = mocha;
module.exports.chai = chai;
module.exports.should = chai.should();
module.exports.assert = chai.assert;
module.exports.request = chai.request;
module.exports.initSpyGenerator = initSpyGenerator;
module.exports.getSpy = getSpy;