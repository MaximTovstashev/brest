var fs = require('fs')
    , path = require('path');

var DIR = fs.realpathSync(path.resolve(require('path').dirname(require.main.filename),'schema'));

module.exports.init = function(settings){
    if (settings && settings.schemaPath){
        DIR = fs.realpathSync(path.resolve(require('path').dirname(require.main.filename),settings.schemaPath));
    }
};

module.exports.handler = function(ref,callback){
    ref = ref.substring(11);
//    console.log(path.join(DIR,ref+".json"));
    fs.readFile(path.join(DIR,ref+".json"),{encoding: "utf8"},function(err,data){
        if (err) {
            console.log("ERROR: ",err);
            callback(err);
            return;
        }
        try {
            var schema = JSON.parse(data);
            callback(null,schema);
        } catch(e){
            console.log("CATCH: ",e);
            callback(e);
        }
    });
};