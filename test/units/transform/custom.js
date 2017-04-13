/* eslint-disable no-undef */
const Custom = require('../../../lib/transform/custom');
const custom = new Custom();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

const customTransformFunction1 = value => value * 2;
const customTransformFunction2 = value => value + 'b';

it('Should have proper designation', (done)=>{
    expect(custom.name).to.be.equal('transform');
    done();
});

it('Should be appliable when transformation is described as a function', (done)=>{
    expect(custom.isAppliable(null)).to.be.false;
    expect(custom.isAppliable(true)).to.be.false;
    expect(custom.isAppliable(42)).to.be.false;
    expect(custom.isAppliable('Beer')).to.be.false;
    expect(custom.isAppliable([1, 2, 3])).to.be.false;
    expect(custom.isAppliable({foo: 'bar'})).to.be.false;
    expect(custom.isAppliable(function(){})).to.be.true;
    expect(custom.isAppliable(() => {})).to.be.true;
    done();
});

it('Should transform value with provided function', (done) => {
    expect(custom.transformation(2, customTransformFunction1)).to.be.equal(4);
    expect(custom.transformation(2, customTransformFunction2)).to.be.equal('2b');
    done();
});

it('Should map array values', (done) => {
    expect(custom.arrayTransformation([2, 3, 10], customTransformFunction1)).to.be.eql([4, 6, 20]);
    done();
});

it('Should be applied correctly', (done) => {
    expect(custom.apply({transform: customTransformFunction1}, 2)).to.be.equal(4);
    expect(custom.apply({transform: customTransformFunction1}, [2, 3, 10])).to.be.eql([4, 6, 20]);
    expect(custom.apply({transform: 42}, 2)).to.be.equal(2);
    expect(custom.apply({do_nothing: customTransformFunction1}, 2)).to.be.equal(2);
    expect(custom.apply({do_nothing: customTransformFunction1}, [2, 3, 10])).to.be.eql([2, 3, 10]);
    done();
});