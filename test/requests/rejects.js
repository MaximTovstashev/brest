/* eslint-disable no-undef */
const generic = require('../generic'),
  chai = generic.chai,
  expect = chai.expect,
  request = generic.request('http://localhost:8080/v1/reject');

const returning_object = {
  user: 'john.doe',
  email: 'john.doe@example.com'
};

const returning_object2 = {
  user: 'jane.doe',
  email: 'jane.doe@example.com',
  hue: 'violet'
};

it('Should reject fields', (done) => {
  request
    .get('/')
    .then((res) => {
      //noinspection BadExpressionStatementJS
      expect(res).to.be.OK;
      expect(res.body).to.be.eql(returning_object);
      expect(res).to.have.status(200);
      done();
    })
    .catch(done);
});

it('Should reject fields in arrays', (done) => {
  request
    .get('/array')
    .then((res) => {
      //noinspection BadExpressionStatementJS
      expect(res).to.be.OK;
      expect(res.body).to.be.eql([returning_object, returning_object2]);
      expect(res).to.have.status(200);
      done();
    })
    .catch(done);
});