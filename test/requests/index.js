const Brest = require('../../lib/brest');
let brest;

before((done) => {
    brest = new Brest(require('../server/settings'));
    brest.on('error', console.log);
    brest.on('ready', () => {
        done();
    });
});

describe('Basic API requests', () => require('./basic'));

after((done) => {
    brest.close(()=>{
        done();
    });
});