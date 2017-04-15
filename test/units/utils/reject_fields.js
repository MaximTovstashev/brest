/* eslint-disable no-undef */
const generic = require('../../generic'),
    chai = generic.chai,
    expect = chai.expect;

const reject = require('../../../lib/utils/reject_fields');

it('Should reject fields from a single object', (done) => {
    const raw_object = {
        foo: 'bar',
        user: 'doe',
        password: 'secret',
        secret: 'hidden'
    };
    const filtered_object = {
        foo: 'bar',
        user: 'doe'
    };
    expect(reject(raw_object, ['password', 'secret'])).to.be.eql(filtered_object);
    done();
});

it('Should reject fields from an array', (done) => {
    const raw_array = [
        {foo: 'bar',
            password: 'secret'},
        {bar: 'baz',
            secret: 'hidden'}
    ];

    const filtered_array = [{foo: 'bar'},{bar: 'baz'}];

    expect(reject(raw_array, ['password', 'secret'])).to.be.eql(filtered_array);
    done();
});