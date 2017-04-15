/* eslint-disable no-undef */
const generic = require('../generic'),
    chai = generic.chai,
    expect = chai.expect,
    request = generic.request('http://localhost:8080/v1/filter');

it('Should use query params as filters', (done) => {
    request
    .get('/basic?foo=bar&bar=baz&gimme=5')
    .then((res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
        expect(res.body).to.be.eql({filters: {foo: 'bar', bar: 'baz'}});
        expect(res).to.have.status(200);
        done();
    })
    .catch(done);
});

it('Should apply limiting transformations', (done) => {
    request
    .get('/limiters?ceil=100&floor=1&between=45')
    .then((res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
        expect(res.body).to.be.eql({filters: {ceil: 10, floor: 10, between: 20}});
        expect(res).to.have.status(200);
        done();
    })
    .catch(done);
});