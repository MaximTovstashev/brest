const toobusy = require('toobusy-js');

const code = require('../http_codes.js');

let tooBusyString = 'Server is too busy to reply';
const tooBusyMiddleware = function (req, res, next) {
    if (toobusy()) {
        res.status(code.TOO_MANY_REQUESTS).send(tooBusyString);
    } else {
        next();
    }
};

function initTooBusy(brest) {

    if (brest.getSetting('toobusy.maxLag')) {
        toobusy.maxLag = this._brest.getSetting('toobusy.maxLag');
    }
    if (brest.getSetting('toobusy.interval')) {
        toobusy.interval = this._brest.getSetting('toobusy.interval');
    }

    tooBusyString = brest.getSetting('application') + ' is too busy to reply';

    return tooBusyMiddleware;
}

module.exports = initTooBusy;