/* eslint-disable no-undef */
const Min = require('../../../lib/transform/min');
const min = new Min();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

it('Should have proper designation', (done)=>{
    expect(min.name).to.be.equal('min');
    done();
});

it('Should be appliable when transformation is described as a number', (done) => {
    expect(min.isAppliable(undefined)).to.be.false;
    expect(min.isAppliable('Foo')).to.be.false;
    expect(min.isAppliable([1])).to.be.false;
    expect(min.isAppliable(([1,2,3]))).to.be.false;
    expect(min.isAppliable([1,10])).to.be.false;
    expect(min.isAppliable(42)).to.be.true;
    done();
});

it('Should limit filter parameter by minimum value', (done) => {
    expect(min.transformation(2, 10)).to.be.equal(10);
    expect(min.transformation(12, 10)).to.be.equal(12);
    expect(min.transformation('13', 10)).to.be.equal(13);
    expect(min.transformation('3', 10)).to.be.equal(10);
    expect(min.transformation('Beer', 10)).to.be.NaN;
    done();
});

it('Should map array values', (done) => {
    expect(min.arrayTransformation([2, 4, 10, 12, '16'], 10)).to.be.eql([10, 10, 10, 12, 16]);
    done();
});

it('Should be applied correctly', (done) => {
    expect(min.apply({min: 10}, 20)).to.be.equal(20);
    expect(min.apply({min: false}, 20)).to.be.equal(20);
    expect(min.apply({min: [29, 32, 10]}, 20)).to.be.equal(20);
    expect(min.apply({foo: 10}, 20)).to.be.equal(20);
    expect(min.apply({min: 10}, [2, 4, 10, 12, '16'])).to.be.eql([10, 10, 10, 12, 16]);
    done();
});