const path = require('path');
const log = require('intel').getLogger('test.server');
const Brest = require('../../lib/brest');

const brest = new Brest();
brest.on('ready', () => {
    brest.bindPath(path.join(__dirname,'api'), (err) => {
        if (err) log.error(err);
    });
});
brest.on('error', (err) => {
    log.error(err);
});