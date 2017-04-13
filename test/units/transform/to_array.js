/* eslint-disable no-undef */
const ToArray = require('../../../lib/transform/to_array');
const toArray = new ToArray();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

it('Should have proper designation', (done)=>{
    expect(toArray.name).to.be.equal('toArray');
    done();
});

it('Should be appliable when transformation is described as boolean "true" or string', (done) => {
    expect(toArray.isAppliable(undefined)).to.be.false;
    expect(toArray.isAppliable([1])).to.be.false;
    expect(toArray.isAppliable(([1,2,3]))).to.be.false;
    expect(toArray.isAppliable({foo: 'bar'})).to.be.false;
    expect(toArray.isAppliable(42)).to.be.false;
    expect(toArray.isAppliable(false)).to.be.false;
    expect(toArray.isAppliable(true)).to.be.true;
    expect(toArray.isAppliable(';')).to.be.true;
    done();
});

it('Should transform string to array using delimiter', (done) => {
    expect(toArray.transformation('1,2,3')).to.be.eql(['1', '2', '3']);
    expect(toArray.transformation('1;2;3')).to.be.eql(['1;2;3']);
    expect(toArray.transformation('1;2;3', ';')).to.be.eql(['1', '2', '3']);
    expect(toArray.transformation('1,2,3', ';')).to.be.eql(['1,2,3']);
    done();
});

it('Should ignore arrays', (done) => {
    expect(toArray.arrayTransformation(['1,2,3', 4, 5])).to.be.eql(['1,2,3', 4, 5]);
    done();
});

it('Should be applied correctly', (done) => {
    expect(toArray.apply({toArray: true}, '1,2,3')).to.be.eql(['1', '2', '3']);
    expect(toArray.apply({toArray: false}, '1,2,3')).to.be.eql('1,2,3');
    expect(toArray.apply({toArray: ';'}, '1,2,3')).to.be.eql(['1,2,3']);
    expect(toArray.apply({toSomething: ';'}, '1,2,3')).to.be.eql('1,2,3');
    expect(toArray.apply({toArray: ';'}, '1;2;3')).to.be.eql(['1', '2', '3']);
    done();
});