const _ = require('lodash'),
    bodyParser = require('body-parser');

function verify(req, res, buf, encoding) {
    req.raw = buf.toString(encoding);
    req.buffer = buf;
}

const BODY_PARSER_JSON = 'json';
const BODY_PARSER_RAW = 'raw';
const BODY_PARSER_TEXT = 'text';
const BODY_PARSER_URLENCODED = 'urlencoded';

const modes = [BODY_PARSER_JSON, BODY_PARSER_URLENCODED, BODY_PARSER_TEXT, BODY_PARSER_RAW];

const settingsDefault = {
    [BODY_PARSER_JSON]: {verify},
    [BODY_PARSER_URLENCODED]: {verify, extended: true},
    [BODY_PARSER_TEXT]: {verify},
    [BODY_PARSER_RAW]: {verify},
};

/**
 * Add a single parse mode to the route middleware
 * @param middle
 * @param mode
 * @param settings
 */
function addMode(middle, mode, settings) {
    if (!modes.includes(mode)) throw `Incorrect bodyparser mode ${mode}`;
    middle.push(bodyParser[mode](settings[mode]));
}

/**
 * Setup bodyParser middleware according to settings
 * @param brest
 * @param description
 */
function initEndpoint(brest, description) {

    const settings = _.defaultsDeep(description.bodyParser, settingsDefault);

    if (description.bodyParserModes) {
        description.bodyParserModes.forEach((mode) => addMode(description.middle, mode, settings));
    } else {
        const mode = description.bodyParserMode || BODY_PARSER_JSON;
        addMode(description.middle, mode, settings);
    }

  // return bodyParser[mode](settings[mode]);
}

function initGlobal(brest) {
    const settings = _.defaultsDeep(brest.settings.bodyParser, settingsDefault);
    modes.forEach(mode => {
        if (settings[mode]) brest.app.use(bodyParser[mode](settings[mode]));
    });
}

module.exports.initEndpoint = initEndpoint;
module.exports.initGlobal = initGlobal;