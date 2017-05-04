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

it('Should apply fromJSON correctly for the valid JSON', (done) => {
    request
    .get('/json?query={"arr":["bar","baz"],"num":42,"float":3.14,"bool":true}')
    .then((res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
        expect(res.body).to.be.eql({filters: {query: {arr: ['bar', 'baz'], num: 42, float: 3.14, bool: true}}});
        expect(res).to.have.status(200);
        done();
    })
    .catch(done);
});

it('Should return code 422 for incorrect fromJSON application', (done) => {
    request
    .get('/json?query={"arr":["bar","baz",num":42{{,"float":3.14,"bool":true}')
      .end((err, res) => {
        //noinspection BadExpressionStatementJS
          expect(res).to.be.OK;
        //noinspection BadExpressionStatementJS
          expect(res.body).to.be.eql({error: 'Unexpected token m in JSON at position 22'});
          expect(res).to.have.status(422);
          done();
      });
});

it('Should detach filters correctly', (done) => {
    request
    .get('/detach/correct?standalone=beer&rename=chaser')
    .then((res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
        expect(res.body).to.be.eql({filters: {}, standalone: 'beer', rabbits: 'chaser'});
        expect(res).to.have.status(200);
        done();
    })
    .catch(done);
});

it('Should return code 422 for incorrect fromJSON application', (done) => {
    request
    .get('/detach/incorrect?crashme=beer')
    .end((err, res) => {
      //noinspection BadExpressionStatementJS
        expect(res).to.be.OK;
      //noinspection BadExpressionStatementJS
        expect(res.body).to.be.eql({error: 'Can\'t detach filter "crashme" to "filters": field already exists'});
        expect(res).to.have.status(500);
        done();
    });
});