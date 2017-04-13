/* eslint-disable no-undef */
const generic = require('../generic'),
    chai = generic.chai,
    expect = chai.expect,
    request = generic.request('http://localhost:8080/v1/basic');

const basic_data = require('../test_data').basic;

it('Should return JSON data on GET request', (done) => {
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

it('Should process request params correctly', (done) => {
    request
    .get('/42/with/strawberry')
    .then((res) => {
        //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
        expect(res).to.have.status(200);
        expect(res.body).to.be.eql({id: '42', secondary_id: 'strawberry'});
        done();
    })
    .catch(done);
});

it('Should accept POST request body as a JSON by default', (done) => {
    request
    .post('/')
    .send(basic_data)
    .then((res) => {
        //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
        expect(res).to.have.status(200);
        expect(res.body).to.be.eql({created: basic_data});
        done();
    })
    .catch(done);
});

it('Should accept PUT request body as a JSON by default', (done) => {
    request
    .put('/42')
    .send(basic_data)
    .then((res) => {
        expect(res).to.be.OK;
        expect(res).to.have.status(200);
        expect(res.body).to.be.eql({updated: '42', withData: basic_data});
        done();
    })
    .catch(done);
});

it('Should accept DELETE request', (done) => {
    request
    .delete('/44')
    .then((res) => {
        expect(res).to.be.OK;
        expect(res).to.have.status(200);
        expect(res.body).to.be.eql({delete: '44'});
        done();
    })
    .catch(done);
});