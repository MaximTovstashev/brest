/* eslint-disable no-undef */
const Max = require('../../../lib/transform/max');
const max = new Max();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

it('Should have proper designation', (done) => {
    expect(max.name).to.be.equal('max');
    done();
});

it('Should be appliable when transformation is described as a number', (done) => {
    expect(max.isAppliable(undefined)).to.be.false;
    expect(max.isAppliable('Foo')).to.be.false;
    expect(max.isAppliable([1])).to.be.false;
    expect(max.isAppliable(([1, 2, 3]))).to.be.false;
    expect(max.isAppliable([1, 10])).to.be.false;
    expect(max.isAppliable(42)).to.be.true;
    done();
});

it('Should limit filter parameter by maximum value', (done) => {
    expect(max.transformation(2, 10)).to.be.equal(2);
    expect(max.transformation(12, 10)).to.be.equal(10);
    expect(max.transformation('13', 10)).to.be.equal(10);
    expect(max.transformation('3', 10)).to.be.equal(3);
    expect(max.transformation('Beer', 10)).to.be.NaN;
    done();
});

it('Should map array values', (done) => {
    expect(max.arrayTransformation([2, 4, 10, 12, '16'], 10)).to.be.eql([2, 4, 10, 10, 10]);
    done();
});

it('Should be applied correctly', (done) => {
    expect(max.apply({max: 20}, 10)).to.be.equal(10);
    expect(max.apply({max: false}, 20)).to.be.equal(20);
    expect(max.apply({max: [29, 32, 10]}, 20)).to.be.equal(20);
    expect(max.apply({foo: 10}, 20)).to.be.equal(20);
    expect(max.apply({max: 10}, [2, 4, 10, 12, '16'])).to.be.eql([2, 4, 10, 10, 10]);
    done();
});