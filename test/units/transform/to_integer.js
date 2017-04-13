/* eslint-disable no-undef */
const ToInteger = require('../../../lib/transform/to_integer');
const toInteger = new ToInteger();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

it('Should have proper designation', (done)=>{
    expect(toInteger.name).to.be.equal('toInteger');
    done();
});

it('Should be appliable when transformation is described as boolean "true"', (done) => {
    expect(toInteger.isAppliable(undefined)).to.be.false;
    expect(toInteger.isAppliable([1])).to.be.false;
    expect(toInteger.isAppliable(([1,2,3]))).to.be.false;
    expect(toInteger.isAppliable({foo: 'bar'})).to.be.false;
    expect(toInteger.isAppliable(42)).to.be.false;
    expect(toInteger.isAppliable('true')).to.be.false;
    expect(toInteger.isAppliable(false)).to.be.false;
    expect(toInteger.isAppliable(true)).to.be.true;
    done();
});

it('Should cast strings to integer', (done) => {
    expect(toInteger.transformation('1')).to.be.eql(1);
    expect(toInteger.transformation('123123')).to.be.eql(123123);
    expect(toInteger.transformation('-10')).to.be.eql(-10);
    expect(toInteger.transformation('Beer')).to.be.eql(0);
    done();
});

it('Should cast float to integer', (done) => {
    expect(toInteger.transformation(3.14)).to.be.eql(3);
    done();
});

it('Should map array values', (done) => {
    expect(toInteger.arrayTransformation(['false', true, '10', '3.14', 3.14])).to.be.eql([0, 1, 10, 3, 3]);
    done();
});

it('Should be applied correctly', (done) => {
    expect(toInteger.apply({toInteger: true}, 'false')).to.be.eql(0);
    expect(toInteger.apply({toInteger: false}, 'false')).to.be.eql('false');
    expect(toInteger.apply({toInteger: 'true'}, 'Beer')).to.be.eql('Beer');
    expect(toInteger.apply({toInteger: true}, '0')).to.be.eql(0);
    expect(toInteger.apply({toInteger: true}, '10')).to.be.eql(10);
    expect(toInteger.apply({toInteger: true}, 10)).to.be.eql(10);
    expect(toInteger.apply({toInteger: true}, 3.14)).to.be.eql(3);
    expect(toInteger.apply({toHellWithIt: true}, '10')).to.be.eql('10');
    expect(toInteger.apply({toInteger: true}, ['false', true, '10', '3.14', 3.14])).to.be.eql([0, 1, 10, 3, 3]);
    done();
});