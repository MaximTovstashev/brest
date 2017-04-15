const _ = require('lodash'),
    multer = require('multer');

function initMulter(description) {

    let multerMiddleware = false;
    let fieldnames = false;
    if (_.isFunction(description.upload)) {
        multerMiddleware = description.upload(multer);
    }
    else {
        fieldnames = description.upload.fieldname || description.upload.fieldnames;
        let multerOptions = {};
        if (description.upload.dest) {
            multerOptions = {dest: description.upload};
        }
        if (description.upload.destination && description.upload.filename) {
            multerOptions = {
                storage: multer.diskStorage({
                    destination: description.upload.destination,
                    filename: description.upload.filename
                })
            };
        }
        multerMiddleware = multer(multerOptions);
    }
    if (_.isString(fieldnames)) {
        multerMiddleware = multerMiddleware.single(fieldnames);
    } else if (_.isArray(fieldnames)) {
        multerMiddleware = multerMiddleware.fields(fieldnames);
    } else if (_.isObject(fieldnames)) {
        multerMiddleware = multerMiddleware.fields(fieldnames.name, fieldnames.maxCount);
    }

    return multerMiddleware;
}

module.exports = initMulter;