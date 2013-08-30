#Brest

##About

Brest is a simple REST API library over [express.js](http://expressjs.com/).

##How do I use it?

###1. Install from package manager

If your project uses [package.json](https://npmjs.org/doc/json.html), simply include

    "dependencies": {
        ...
        "brest": "*",
        ...
    }

and then in the shell, in project root folder execute:

    $ npm install

Otherwise, you can install brest globally with npm and have it available from anywhere on your machine:

    $ npm install -g brest

###2 Setup
####2.1 Application file

In your application file:

    // Require brest library
    var brest = require("brest");

    // Require and setup express
    var express = require('express');

    // Create express application object
    var app = express();

    // Initialize and setup express
    ...

    //Initialize and setup brest
    brest(app);

####2.2 Brest folders

By default, Brest uses the following folders:

* ./api — for the api scripts
* ./schema — for json-schema files

####2.3 API script file structure

API scripts are expected to export object files with the following structure:

```javascript
{
    version: 1,
    description: "Resource description" //Description for the Docker
    resources: [
        //Here come the resource objects
    ]
}
```

Here, the version property and the filename define the beginning of the methods' URI. For instance, if API object from ./api/user.js has property version: 1, the URI will start with /v1/user. After that, the resource
objects description is used:

Resource object has the following structure (properties placed alphabetically):

```javascript
{
    description: "Some description goes here", //Description for the Docker

    /**
     * Handler function: receives Express JS object and a callback function.
     */
    handler: function(req, callback) {
        callback(err, result);
    },

    /**
     * Validation method. It is supposed to use express-validator (assertion part of it), but it can be
     * also used as a custom validator. Any data returned by this method will be considered as an error message
     */
    validator: function(req){
        req.assert('fooId').notEmpty().isNumeric();
    },

    method: "POST", //or any other HTTP method

    /**
     * Middleware. E.g. passport authentication middleware. Required mostly in auth resources.
     **/
    middle: passport.authenticate('local'),

    noAuth: false, //default: false. If true, no authentication is needed for this resource

    schema: "resource-schema", //Json-schema id. See "JSON validation" (TBD now)

    stub: false, //default: false. If true, resource returns "Not implemented yet" message.

    uri: ":fooId", //additional params, if any

}
```

###2.4 Settings

Certain default settings may be overridden by providing user settings. Settings object is passed to the brest() as
the second parameter.

```javascript
    var settings = {
        apiPath: "/var/poject/myApi",                 //Path to API resources files
        schemaLoader: "mySchemaLoader"    //User schema loader. Either the key of existing loader, or path to file
        schemaURL: "local://schemas/"   //Json schema URL's. See JaySchema documentation.
        schemaPath: "/var/poject/mySchemas"        //Path to .json files with json schemas
    }

    brest(app, settings);
```

###2.5 Setting up validation

In current version you have to add express-validator manually.

```javascript
//In your main file:

var expressValidator = require('express-validator`)

//...

app.use(expressValidator);
```

Note, that you will require version 0.3.0 for the project to work correctly. This would be fixed in the coming versions,
as express-validator is to be replaced with the native wrapper.

##3 Serving requests

###3.1 Supported methods

The following methods are being supported by Brest:

```
GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH, TRACE
```

If the request is send to existing URI with undefined method (say, you have GET /v1/kittens and POST /v1/kittens, but
you try to DELETE /v1/kittens) brest will respond with 405 error code and response header will contain Allow field
with "GET, POST"

##4 Extensions

###4.1 Docker

[Docker](https://github.com/MaximTovstashev/brest-docker) extension automatically builds documentation for the Brest API function.

##Changes

####0.0.4-4

 - Changes in settings handling.
 - Documentation update

####0.0.4-3

When no filters are defined, *req.filters* is an empty Object, not undefined property.

####0.0.4-2

Documentation update.

####0.0.4-1

Fixed issue with loading JSON-schema files.

###0.0.4

Fixed issue with URL parameters passed to method with no described filters.

###0.0.3

First working version.

##MIT License

Copyright © 2013 Maxim Tovstashev <max.kitsch@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.