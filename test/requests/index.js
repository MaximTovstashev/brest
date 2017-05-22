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

describe('Basic API requests', () => require('./basic'));
describe('Basic API requests with promises', () => require('./promise'));
describe('Returning error messages', () => require('./errors'));
describe('Filters', () => require('./filters'));
describe('Rejects', () => require('./rejects'));
describe('Async initialization', () => require('./async'));
describe('Overriding noun', () => require('./noun'));

after((done) => {
    brest.close(() => {
        done();
    });
});