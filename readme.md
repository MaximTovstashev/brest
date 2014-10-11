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

```javascript
    // Require brest library
    var Brest = require("brest");
    var brest = new Brest(require('%path_to_settings%'));
```

####2.2 Brest folders

By default, Brest uses the following folders:

* ./api — for the api scripts

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

Here, the version property and the filename define the beginning of the methods' URI. For instance, if API object from ./api/persons.js has property version: 1, the URI will start with /v1/user. After that, the resource
objects description is used:

Resource object has the following structure (properties placed alphabetically):

```javascript
{
    description: "Some description goes here", //Description for the Docker

    /**
     * Handler function: receives Express JS object and a callback function.
     */
    handler: function(req, callback) {
        callback(err, result, options);
    },

    method: "POST", //or any other HTTP method

    noAuth: false, //default: false. If true, no authentication is needed for this resource

    stub: false, //default: false. If true, resource returns "Not implemented yet" message.

    uri: ":fooId", //additional params, if any

}
```

####2.3.1 Possible response options

Add to the response object for the handler callback

**ignoreJSON** {Boolean} use res.send() instead of res.json() even if return data is object. Can be useful, if you want to send json, as text/html, for some reason.

**code** {Number||String} send response with arbitrary code

**headers** {Object} Set headers from {('key': 'value')} object.

**cookies** {Array} Set cookies {name: "name", value: "value", options: {Object}}

**file** {String} Send file to user. 

**redirect** {String} Redirect user to given URL

###2.4 Settings

Certain default settings may be overridden by providing user settings. Settings object is passed to the brest() as
the second parameter.

```javascript
    var settings = {
        application: "%app_name%",      // Application name
        environment: "dev",             // Environmen type
        version: 1,                     // API default version
        server: {
            port: 8080                  // Listed on port
        },
        static: {
            public: "public"            // Public folder path
        }
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
//  api/persons.js
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

###4.1 Current

#### Authentication

[Passport](https://github.com/MaximTovstashev/brest-passport) Authenticating user with PassportJS

#### Database handling

[MariaDB](https://github.com/MaximTovstashev/brest-maria) MariaDB (unstable!)

#### Validation
[Jayschema](https://github.com/MaximTovstashev/brest-jayschema) JaySchema POST Json Schema validation
[Validation](https://github.com/MaximTovstashev/brest-jayschema) Request params validation


###4.2 Obsolete

[Docker](https://github.com/MaximTovstashev/brest-docker) (obsolete!) extension automatically builds documentation for the Brest API function.
This extension is currently not supported.

##Changes

####0.0.4-6

- Response options added

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