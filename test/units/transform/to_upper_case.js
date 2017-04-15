/* eslint-disable no-undef */
const ToUpperCase = require('../../../lib/transform/to_upper_case');
const toUpperCase = new ToUpperCase();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

it('Should have proper designation', (done)=>{
    expect(toUpperCase.name).to.be.equal('toUpperCase');
    done();
});

it('Should be appliable when transformation is described as boolean "true"', (done) => {
    expect(toUpperCase.isAppliable(undefined)).to.be.false;
    expect(toUpperCase.isAppliable([1])).to.be.false;
    expect(toUpperCase.isAppliable(([1,2,3]))).to.be.false;
    expect(toUpperCase.isAppliable({foo: 'bar'})).to.be.false;
    expect(toUpperCase.isAppliable(42)).to.be.false;
    expect(toUpperCase.isAppliable('true')).to.be.false;
    expect(toUpperCase.isAppliable(false)).to.be.false;
    expect(toUpperCase.isAppliable(true)).to.be.true;
    done();
});

it('Should cast strings to uppercase', (done) => {
    expect(toUpperCase.transformation('Beer and Vodka')).to.be.eql('BEER AND VODKA');
    expect(toUpperCase.transformation('LoTsOfFuN')).to.be.eql('LOTSOFFUN');
    done();
});

it('Should map array values', (done) => {
    expect(toUpperCase.arrayTransformation(['Beer', 'Vodka', 'LoTsOfFuN'])).to.be.eql(['BEER', 'VODKA', 'LOTSOFFUN']);
    done();
});

it('Should be applied correctly', (done) => {
    expect(toUpperCase.apply({toUpperCase: true},'Beer and Vodka')).to.be.eql('BEER AND VODKA');
    expect(toUpperCase.apply({toUpperCase: false}, 'Beer and Vodka')).to.be.eql('Beer and Vodka');
    expect(toUpperCase.apply({toUpperCase: 'true'}, 'Beer and Vodka')).to.be.eql('Beer and Vodka');
    expect(toUpperCase.apply({toUpperCase: true}, 'LoTsOfFuN')).to.be.eql('LOTSOFFUN');
    expect(toUpperCase.apply({toUpperCase: true}, ['Beer', 'Vodka', 'LoTsOfFuN'])).to.be.eql(['BEER', 'VODKA', 'LOTSOFFUN']);
    done();
});