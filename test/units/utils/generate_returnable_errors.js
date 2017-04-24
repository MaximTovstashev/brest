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

it('Should process Array', (done) => {
    const err = generateReturnableErrors(['Test error', 'Test error2']);
  //noinspection BadExpressionStatementJS
    expect(err).to.be.OK;
    expect(err.body).to.be.eql({error: ['Test error', 'Test error2']});
    expect(err.options).to.be.eql({code: 500});
    done();
});

it('Should process Object', (done) => {
    const err = generateReturnableErrors({message: 'He\'s dead, Jim!'});
  //noinspection BadExpressionStatementJS
    expect(err).to.be.OK;
    expect(err.body).to.be.eql({message: 'He\'s dead, Jim!'});
    expect(err.options).to.be.eql({code: 500});
    done();
});

it('Should process Object and get HTTP code out of it', (done) => {
    const err = generateReturnableErrors({message: 'He\'s dead, Jim!', code: 404});
  //noinspection BadExpressionStatementJS
    expect(err).to.be.OK;
    expect(err.body).to.be.eql({message: 'He\'s dead, Jim!'});
    expect(err.options).to.be.eql({code: 404});
    done();
});

it('Should not return function', (done) => {
    const err = generateReturnableErrors(foo => foo+'bar');
  //noinspection BadExpressionStatementJS
    expect(err).to.be.OK;
    expect(err.body).to.be.eql({error: 'Incorrect error type "function"'});
    expect(err.options).to.be.eql({code: 500});
    done();
});

it('Should build generic error for unknown type', (done) => {
    const err = generateReturnableErrors(42);
  //noinspection BadExpressionStatementJS
    expect(err).to.be.OK;
    expect(err.body).to.be.eql({error: 'Unexpected error format'});
    expect(err.options).to.be.eql({code: 500});
    done();
});