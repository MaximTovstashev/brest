/* eslint-disable no-undef */
const Clamp = require('../../../lib/transform/clamp');
const clamp = new Clamp();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

it('Should have proper designation', (done) => {
    expect(clamp.name).to.be.equal('clamp');
    done();
});

it('Should be appliable when transformation is described as an array with two params', (done) => {
    expect(clamp.isAppliable(undefined)).to.be.false;
    expect(clamp.isAppliable(42)).to.be.false;
    expect(clamp.isAppliable('Foo')).to.be.false;
    expect(clamp.isAppliable([1])).to.be.false;
    expect(clamp.isAppliable(([1, 2, 3]))).to.be.false;
    expect(clamp.isAppliable([1, 10])).to.be.true;
    done();
});

it('Should clamp transformed parameter between lower and upper value', (done) => {
    expect(clamp.transformation(2, [5, 10])).to.be.equal(5);
    expect(clamp.transformation(12, [5, 10])).to.be.equal(10);
    expect(clamp.transformation(8, [5, 10])).to.be.equal(8);
    expect(clamp.transformation('3', [5, 10])).to.be.equal(5);
    expect(clamp.transformation('Beer', [5, 10])).to.be.NaN;
    done();
});

it('Should map array values', (done) => {
    expect(clamp.arrayTransformation([2, 6, 10, 12, '16'], [5, 10])).to.be.eql([5, 6, 10, 10, 10]);
    done();
});

it('Should be applied correctly', (done) => {
    expect(clamp.apply({clamp: [5, 10]}, 2)).to.be.equal(5);
    expect(clamp.apply({clamp: [5, 10]}, 12)).to.be.equal(10);
    expect(clamp.apply({clamp: false}, 20)).to.be.equal(20);
    expect(clamp.apply({clamp: [29, 32, 10]}, 20)).to.be.equal(20);
    expect(clamp.apply({clamp: [29]}, 20)).to.be.equal(20);
    expect(clamp.apply({foo: 10}, 20)).to.be.equal(20);
    expect(clamp.apply({clamp: [5, 10]}, [2, 6, 10, 12, '16'])).to.be.eql([5, 6, 10, 10, 10]);
    done();
});