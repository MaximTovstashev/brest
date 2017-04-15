/* eslint-disable no-undef */
const Brest = require('../../lib/brest');
const generic = require('../generic');
let brest;

before((done) => {
    brest = new Brest(require('../server/settings'));
    brest.on('ready', () => {
        done();
    });
    generic.initSpyGenerator(brest);
});

// describe('Basic API requests', () => require('./basic'));
// describe('Basic API requests with promises', () => require('./promise'));
describe('Returning error messages', () => require('./errors'));

after((done) => {
    brest.close(()=>{
        done();
    });
});