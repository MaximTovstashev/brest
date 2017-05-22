/* eslint-disable no-undef */
const generic = require('../generic'),
    chai = generic.chai,
    expect = chai.expect,
    request = generic.request('http://localhost:8080/v1/redefined');

const basic_data = require('../test_data').basic;

it('Should be able to access redefined noun', (done) => {
    request
    .get('/')
    .then((res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
        expect(res.body).to.be.eql(basic_data);
        expect(res).to.have.status(200);
        done();
    })
    .catch(done);
});