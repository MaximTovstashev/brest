/* eslint-disable no-undef */
const generic = require('../generic'),
    chai = generic.chai,
    expect = chai.expect,
    request = generic.request('http://localhost:8080/v1/error');

it('Should return default 500 error code with error message', (done) => {
    const errSpy = generic.getSpy();
    request
    .get('/')
    .end((err, res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
      //noinspection BadExpressionStatementJS
        expect(errSpy).to.be.spy;
        expect(errSpy).to.be.called.once.with({error: {error: 'Test error'}});
        expect(res.body).to.be.eql({error: 'Test error'});
        expect(res).to.have.status(500);
        done();
    });
});

it('Should return default 500 error code with error message from promise', (done) => {
    const errSpy = generic.getSpy();
    request
    .get('/promise')
    .end((err, res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
      //noinspection BadExpressionStatementJS
        expect(errSpy).to.be.spy;
        expect(errSpy).to.be.called.once.with({error: {error: 'Test error reject'}});
        expect(res.body).to.be.eql({error: 'Test error reject'});
        expect(res).to.have.status(500);
        done();
    });
});

it('Should return specific code when defined in error callback call', (done) => {
    request
    .get('/code')
    .end((err, res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
      //noinspection BadExpressionStatementJS
        expect(res.body).to.be.eql({error: 'Test error with 400'});
        expect(res).to.have.status(400);
        done();
    });
});

it('Should return specific code when defined in promise reject', (done) => {
    request
    .get('/promise/code')
    .end((err, res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
      //noinspection BadExpressionStatementJS
        expect(res.body).to.be.eql({error: 'Test error reject with 400'});
        expect(res).to.have.status(400);
        done();
    });
});

it('Should return 405 (Method not supported) code requested for unsupported method', (done) => {
    request
    .put('/')
    .end((err, res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
      //noinspection BadExpressionStatementJS
        expect(res.body).to.be.empty;
        expect(res).to.have.status(405);
        expect(res).to.have.header('Allow', 'GET,POST');
        done();
    });
});