var fs = require('fs'),
    path = require('path'),
    API = require('./api.js');


module.exports = function (app, settings) {

    var apiPath = 'api';

    if (settings && settings.path) apiPath = settings.path;

    var DIR = fs.realpathSync(path.resolve(require('path').dirname(require.main.filename),apiPath));
    var resources = fs.readdirSync(DIR);

    API.init(settings);

    for (i=0; i<resources.length; i++)
    {
        var resource = resources[i];

        try {
            if (resource.indexOf(".js")==resource.length-3)
                API.bind(app, resource.substring(0,resource.length-3), require(path.join(DIR,resource)));
        } catch (e){
            console.log("Failed to initialize API resource",resource,e);
        }
    }
};
