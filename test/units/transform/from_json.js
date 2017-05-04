/* eslint-disable no-undef */
const FromJSON = require('../../../lib/transform/from_json');
const fromJSON = new FromJSON();

const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

const VALID_JSON = '{"arr": ["bar", "baz"], "num": 42, "float": 3.14, "bool": true}';
const VALID_OBJECT = {arr: ['bar', 'baz'], num: 42, float: 3.14, bool: true};

it('Should have proper designation', (done) => {
    expect(fromJSON.name).to.be.equal('fromJSON');
    done();
});

it('Should be appliable when transformation is described as boolean "true"', (done) => {
    expect(fromJSON.isAppliable(undefined)).to.be.false;
    expect(fromJSON.isAppliable([1])).to.be.false;
    expect(fromJSON.isAppliable(([1, 2, 3]))).to.be.false;
    expect(fromJSON.isAppliable({foo: 'bar'})).to.be.false;
    expect(fromJSON.isAppliable(42)).to.be.false;
    expect(fromJSON.isAppliable('true')).to.be.false;
    expect(fromJSON.isAppliable(false)).to.be.false;
    expect(fromJSON.isAppliable(true)).to.be.true;
    done();
});

it('Should parse valid JSONs correctly', (done) => {
    expect(fromJSON.transformation(VALID_JSON)).to.be.eql(VALID_OBJECT);
    expect(fromJSON.transformation('"string"')).to.be.eql('string');
    expect(fromJSON.transformation('42')).to.be.eql(42);
    done();
});

it('Should map array values', (done) => {
    expect(fromJSON.arrayTransformation([VALID_JSON, '"string"', '42'])).to.be.eql([VALID_OBJECT, 'string', 42]);
    done();
});

it('Should be applied correctly', (done) => {
    expect(fromJSON.apply({fromJSON: true}, VALID_JSON)).to.be.eql(VALID_OBJECT);
    expect(fromJSON.apply({fromJSON: false}, VALID_JSON)).to.be.eql(VALID_JSON);
    expect(fromJSON.apply({fromJSON: 'true'}, VALID_JSON)).to.be.eql(VALID_JSON);
    expect(fromJSON.apply({fromJSON: true}, '"string"')).to.be.eql('string');
    done();
});