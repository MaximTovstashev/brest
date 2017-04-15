/* eslint-disable no-undef */
const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

const generateReturnableErrors = require('../../../lib/utils/generate_returnable_error');

it('Should process Error object', (done) => {
    const err = generateReturnableErrors(new Error('Test error'));
    //noinspection BadExpressionStatementJS
    expect(err).to.be.OK;
    expect(err.body).to.be.eql({error: 'Test error'});
    expect(err.options).to.be.eql({code: 500});
    done();
});

it('Should process Strings', (done) => {
    const err = generateReturnableErrors('Test error');
  //noinspection BadExpressionStatementJS
    expect(err).to.be.OK;
    expect(err.body).to.be.eql({error: 'Test error'});
    expect(err.options).to.be.eql({code: 500});
    done();
});