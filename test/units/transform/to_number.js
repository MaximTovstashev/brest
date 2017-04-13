/* eslint-disable no-undef */
const ToNumber = require('../../../lib/transform/to_number');
const toNumber = new ToNumber();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

it('Should have proper designation', (done)=>{
    expect(toNumber.name).to.be.equal('toNumber');
    done();
});

it('Should be appliable when transformation is described as boolean "true"', (done) => {
    expect(toNumber.isAppliable(undefined)).to.be.false;
    expect(toNumber.isAppliable([1])).to.be.false;
    expect(toNumber.isAppliable(([1,2,3]))).to.be.false;
    expect(toNumber.isAppliable({foo: 'bar'})).to.be.false;
    expect(toNumber.isAppliable(42)).to.be.false;
    expect(toNumber.isAppliable('true')).to.be.false;
    expect(toNumber.isAppliable(false)).to.be.false;
    expect(toNumber.isAppliable(true)).to.be.true;
    done();
});

it('Should cast strings to Number', (done) => {
    expect(toNumber.transformation('1')).to.be.eql(1);
    expect(toNumber.transformation('123123')).to.be.eql(123123);
    expect(toNumber.transformation('-10')).to.be.eql(-10);
    expect(toNumber.transformation('3.14')).to.be.eql(3.14);
    expect(toNumber.transformation('Beer')).to.be.eql(NaN);
    done();
});

it('Should map array values', (done) => {
    expect(toNumber.arrayTransformation(['false', true, '10', '3.14', 3.14])).to.be.eql([NaN, 1, 10, 3.14, 3.14]);
    done();
});

it('Should be applied correctly', (done) => {
    expect(toNumber.apply({toNumber: true}, 'false')).to.be.eql(NaN);
    expect(toNumber.apply({toNumber: false}, 'false')).to.be.eql('false');
    expect(toNumber.apply({toNumber: 'true'}, 'Beer')).to.be.eql('Beer');
    expect(toNumber.apply({toNumber: true}, '0')).to.be.eql(0);
    expect(toNumber.apply({toNumber: true}, '10')).to.be.eql(10);
    expect(toNumber.apply({toNumber: true}, 10)).to.be.eql(10);
    expect(toNumber.apply({toNumber: true}, 3.14)).to.be.eql(3.14);
    expect(toNumber.apply({toHellWithIt: true}, '10')).to.be.eql('10');
    expect(toNumber.apply({toNumber: true}, ['false', true, '10', '3.14', 3.14])).to.be.eql([NaN, 1, 10, 3.14, 3.14]);
    done();
});