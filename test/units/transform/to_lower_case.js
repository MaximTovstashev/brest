/* eslint-disable no-undef */
const ToLowerCase = require('../../../lib/transform/to_lower_case');
const toLowerCase = new ToLowerCase();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

it('Should have proper designation', (done)=>{
    expect(toLowerCase.name).to.be.equal('toLowerCase');
    done();
});

it('Should be appliable when transformation is described as boolean "true"', (done) => {
    expect(toLowerCase.isAppliable(undefined)).to.be.false;
    expect(toLowerCase.isAppliable([1])).to.be.false;
    expect(toLowerCase.isAppliable(([1,2,3]))).to.be.false;
    expect(toLowerCase.isAppliable({foo: 'bar'})).to.be.false;
    expect(toLowerCase.isAppliable(42)).to.be.false;
    expect(toLowerCase.isAppliable('true')).to.be.false;
    expect(toLowerCase.isAppliable(false)).to.be.false;
    expect(toLowerCase.isAppliable(true)).to.be.true;
    done();
});

it('Should cast strings to lowercase', (done) => {
    expect(toLowerCase.transformation('Beer and Vodka')).to.be.eql('beer and vodka');
    expect(toLowerCase.transformation('LoTsOfFuN')).to.be.eql('lotsoffun');
    done();
});

it('Should map array values', (done) => {
    expect(toLowerCase.arrayTransformation(['Beer', 'Vodka', 'LoTsOfFuN'])).to.be.eql(['beer', 'vodka', 'lotsoffun']);
    done();
});

it('Should be applied correctly', (done) => {
    expect(toLowerCase.apply({toLowerCase: true},'Beer and Vodka')).to.be.eql('beer and vodka');
    expect(toLowerCase.apply({toLowerCase: false}, 'Beer and Vodka')).to.be.eql('Beer and Vodka');
    expect(toLowerCase.apply({toLowerCase: 'true'}, 'Beer and Vodka')).to.be.eql('Beer and Vodka');
    expect(toLowerCase.apply({toLowerCase: true}, 'LoTsOfFuN')).to.be.eql('lotsoffun');
    expect(toLowerCase.apply({toLowerCase: true}, ['Beer', 'Vodka', 'LoTsOfFuN'])).to.be.eql(['beer', 'vodka', 'lotsoffun']);
    done();
});