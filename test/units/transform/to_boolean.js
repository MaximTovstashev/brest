/* eslint-disable no-undef */
const ToBoolean = require('../../../lib/transform/to_boolean');
const toBoolean = new ToBoolean();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

it('Should have proper designation', (done) => {
    expect(toBoolean.name).to.be.equal('toBoolean');
    done();
});

it('Should be appliable when transformation is described as boolean "true"', (done) => {
    expect(toBoolean.isAppliable(undefined)).to.be.false;
    expect(toBoolean.isAppliable([1])).to.be.false;
    expect(toBoolean.isAppliable(([1, 2, 3]))).to.be.false;
    expect(toBoolean.isAppliable({foo: 'bar'})).to.be.false;
    expect(toBoolean.isAppliable(42)).to.be.false;
    expect(toBoolean.isAppliable('true')).to.be.false;
    expect(toBoolean.isAppliable(false)).to.be.false;
    expect(toBoolean.isAppliable(true)).to.be.true;
    done();
});

it('Should transform "false" and "0" to false', (done) => {
    expect(toBoolean.transformation('0')).to.be.false;
    expect(toBoolean.transformation('false')).to.be.false;
    expect(toBoolean.transformation('False')).to.be.false;
    done();
});

it('Should transform rest of the strings to true', (done) => {
    expect(toBoolean.transformation('1')).to.be.true;
    expect(toBoolean.transformation('000')).to.be.true;
    expect(toBoolean.transformation('true')).to.be.true;
    expect(toBoolean.transformation('Lenin lives')).to.be.true;
    done();
});

it('Should cast numbers to boolean', (done) => {
    expect(toBoolean.transformation(0)).to.be.false;
    expect(toBoolean.transformation(1)).to.be.true;
    expect(toBoolean.transformation(10)).to.be.true;
    expect(toBoolean.transformation(3.14)).to.be.true;
    expect(toBoolean.transformation(-5)).to.be.true;
    done();
});

it('Should map array values', (done) => {
    expect(toBoolean.arrayTransformation(['false', 'true', '0', '1', 0, 1, false, true])).to.be.eql([false, true, false, true, false, true, false, true]);
    done();
});

it('Should be applied correctly', (done) => {
    expect(toBoolean.apply({toBoolean: true}, 'false')).to.be.false;
    expect(toBoolean.apply({toBoolean: false}, 'false')).to.be.eql('false');
    expect(toBoolean.apply({toBoolean: 'true'}, 'Beer')).to.be.eql('Beer');
    expect(toBoolean.apply({toBoolean: true}, '0')).to.be.false;
    expect(toBoolean.apply({toHellWithIt: true}, '0')).to.be.eql('0');
    expect(toBoolean.apply({toBoolean: true}, ['false', 'true', '0', '1', 0, 1, false, true])).to.be.eql([false, true, false, true, false, true, false, true]);
    done();
});