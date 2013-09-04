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

###2.6 Setting up authentication

In current version, the only supported authentication library is [passport](https://npmjs.org/package/passport). It should
be included manually into the project, and it's setup is also held outside Brest, since it may depend on data model level.

Setup passport as it is supposed for express.js. Then, add some authorization resources for your authorization strategies.
For instance, if we use [passport-local](https://npmjs.org/package/passport-local), we add the following resource:

```javascript
//api/auth.js (or any other api resource file of your choise)

module.exports = {
        {
            description: function(){/*
                Authorize using login and password

                #####Parameters:
                * **email** User email
                * **password** User password

                */},
            method: "POST",
            noAuth: true,
            schema: "user-auth",
            middle: passport.authenticate('local'),
            handler: function(req,callback){
                callback(null,{gatekeeper: "Confirmed"});
            }
        },
        {
            method: "GET",
            uri: "logout",
            handler: function(req, callback){
                req.logout();
                callback(null,{gatekeeper: "Have a nice day!"})
            }
        }
//...
}
```

##3 Serving requests

###3.1 Supported methods

The following methods are being supported by Brest:

```
GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH, TRACE
```

If the request is send to existing URI with undefined method (say, you have GET /v1/kittens and POST /v1/kittens, but
you try to DELETE /v1/kittens) brest will respond with 405 error code and response header will contain Allow field
with "GET, POST"

###3.2 Request URL parameters

Request parameters can be passed both as a part of the path and the query string. Path parameters are described in
"uri" property of resource description object:

```javascript
    //...
        uri: "/floor/:floorId/room/:roomId"
    //...
```

Here *:floorId* and *:roomId* are path parameters and they would be accessible in req.params object as req.params.floorId
and req.params.roomId respectively.

Query strings are supposed to be described in *filters* property:

```javascript
    {
        method: GET.
        description: "Get car list",
        noAuth: true,
        filters: {
            "manufacturer": "Filter by manufacturer",
            "yom": "Filter by the year of manufacture",
            "color": "Filter by color",
        }
    }
```

Filter values are stored in req.filters property as key:value.

These properties description are used by Docker to create detailed description of the resource. You can also use
user data replacement:

```javascript
//  api/user.js
//...
        {
            method: "GET",
            uri: "list",
            description: "Returns users list",
            filters: {
                subscribed_to: {
                    description: "Select user, subscribed to given user",
                    replaceMe: 'id'
                },
                subscribed_by: {
                    description: "Select user, subscribed by given user",
                    replaceMe: 'id'
                },
                name: "Get users with names identical or close to given name"
            },
            handler: function(req,callback){
                userCtrl.list(req.filters, callback);
            }
        }
//...
```

In this case, if /v1/api/user?subscribed\_to=me is called, req.filters.subscribed\_to with be equal to req.user.id.
If user in not authenticated or req.user doesn't contain ['id'] property, 403 error would be returned by server.

##4 Extensions

###4.1 Docker

[Docker](https://github.com/MaximTovstashev/brest-docker) extension automatically builds documentation for the Brest API function.

##Changes

####0.0.4-5

 - Now it is possible to define auto-replacement for "me" filter value
 - Documentation update

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