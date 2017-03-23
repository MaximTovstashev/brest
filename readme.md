# Brest

## About

Brest is a simple REST API library over [express.js](http://expressjs.com/).

## How do I use it?

### 1. Install from package manager

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

### 2 Setup
#### 2.1 Application file

In your application file:

```javascript
    // Require brest library
    var Brest = require("brest");
    var brest = new Brest(require('%path_to_settings%'));
```

#### 2.2 Brest folders

By default, Brest uses the following folders:

* ./api — for the api scripts

#### 2.3 API script file structure

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
    allowCORS: false, //default: false. Allow CORS for this method
    
    enabled: ['foobar'], //Enable condition. See 2.5 Enable/disable conditions

    description: "Some description goes here", //Description for the Docker

    disabled: {environment: 'dev'} //Disable condition. See 2.4 Enable/disable conditions

    /**
     * Handler function: receives Express JS object and a callback function.
     * If no handler provided, blank handler will return error
     */
    handler: function(req, callback) {
        callback(err, result, options);
    },

    method: "POST", //default: GET. HTTP method required.

    noAuth: false, //default: false. If true, no authentication is needed for this resource
    
	/**
	 * Obsolete method flag
	 * If true, warning message is written to console each time the method is called
     * Optionally can be a string with proposed new uri
     */
    obsolete: true|"new/uri",

    screen: {noAuth: ['some_field']}, //Remove fields from response. Currently for noAuth only

    stub: false, //default: false. If true, resource returns "Not implemented yet" message.

    uri: ":fooId", //additional params, if any

}
```

#### 2.3.1 Possible response options

Add to the response object for the handler callback

**ignoreJSON** {Boolean} use res.send() instead of res.json() even if return data is object. Can be useful, if you want to send json, as text/html, for some reason.

**code** {Number||String} send response with arbitrary code

**headers** {Object} Set headers from {('key': 'value')} object.

**cookies** {Array} Set cookies {name: "name", value: "value", options: {Object}}

**file** {String} Send file to user.

**fileName** {String} Provide this file with specific name.

**fileCallback** {String} Specify function to call when user has finished downloading.

**redirect** {String} Redirect user to given URL

### 2.4 Settings

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
        },
        api_url: {
          	prefix: 'api/',				// Prepend url with leading string.
          	unversioned: true			// Don't include API version into the URL (default false)
        }
    }

```

### 2.5 Enable/disable conditions

Path objects can be enabled or disabled by certain settings conditions.

**enabled** property defines which settings are
 required for the path to be used. **ALL** conditions must be met in order for path to be used.

**disabled** property is responsible for switching off the path. **ANY** condition must be met for the path to be
  disabled.

First enabled conditions are checked, and then disabled conditions are checked. Which means, if settings meet both
conditions, the path will be disabled disregarding 'enabled' condition.

#### 2.5.1 Conditions setup

The following formats are possible (appliable for "disabled" as well):


```
enabled: true|false;
```
If condition is *Boolean* it does what it means. Disable or enable path depending on boolean value.


```
enabled: 'stringCondition';
```
If condition is *String*, settings value for 'stringCondition' key is required to be **true** for condition to fire. It is
possible to use dot to check nested settings key. For instance:

```
enabled: 'property_pingable.foobar';
```

will check brest settings object for

```javascript
var settings = {
   //...
   property_pingable: {
       foobar: true;
   }
   //...
}
```

Missing settings are treated as if they had **false** value


```
 enabled: ['stringCondition1', 'stringCondition2'];
```
If condition is *Array*, it should contain strings, that will be cheched in the same manner as single string. For
condition to be met it is required for all settings, described in array to be **true**


```
 enabled: {environment: 'dev', enable_selected_paths: true};
```
If condition is *Object*, for each object property the value should be equal (non strict, ==) to one in the settings.
Nested settings are described same as in previous options. I.e.
```
 enabled: {'property_pingable.foobar': true}; //CORRECT


 enabled: {property_pingable: { //INCORRECT
              foobar': true
          			}
		      };
```


## 3 Serving requests

### 3.1 Supported methods

The following methods are being supported by Brest:

```
GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH, TRACE
```

If the request is send to existing URI with undefined method (say, you have GET /v1/kittens and POST /v1/kittens, but
you try to DELETE /v1/kittens) Brest will respond with 405 error code and response header will contain Allow field
with "GET, POST"

### 3.2 Request URL parameters
#### 3.2.1 Basic handling
Request parameters can be passed both as a part of the path and the query string. Path parameters are described in
"uri" property of resource description object:

```javascript
    //...
        uri: "/floor/:floorId/room/:roomId"
    //...
```

Here *:floorId* and *:roomId* are path parameters and they would be accessible in req.params object as req.params.floorId
and req.params.roomId respectively.

#### 3.2.2 Filtering
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

#### 3.2.3 Complex filter descriptions
These properties description are used by documentation creation scripts to create detailed description of the resource. You can also use
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

By default 'me' and 'mine' are replaced with current user id. It is possible to add more replacements by 'replaceMe'
setting. (e.g. settings.replaceMe = ['own', 'private']).

#### 3.2.4 Filter transformations

It is possible to automatically transform filter values. The following transformations can be used:

- *toArray*: transform comma-separated string into array. If provided with string value, it will be used as custom separator. 
This transformation is made **before** any other. Unless stated otherwise, transformation filters will be applied to each array element separately.
- *toLowerCase*: transform filter value to lower case
- *toUpperCase*: transform filter value to upper case
- *toFinite*: transform filter value to finite number
- *toInteger*: transform filter value to integer
- *toNumber*: transform filter value to number
- *toBoolean*: transform filter value to boolean. Note, that strings *"false"* and *"0"* are cast to boolean **false**
- *min*, *max*: limit numeric filter value. Consider using transformation to number with this parameters.
- *clamp*: takes array of [min, max], ensures value stays between these numbers. Pre-cast to number is recommended as well. 
- *transform*: provide custom transformation synchronous function

Please, note, that transform filters are always applied before value limit filters and custom transform is applied the last.

```javascript
//...
        {
            method: "GET",
            uri: "list",
            description: "Returns users list",
            filters: {
                username: {
                    description: "Filter by username",
                    toLowerCase: true
                },
                city_code: {
                    description: "Filter by city code",
                    toUpperCase: true
                },
                secret_nickname: {
					description: "Filter by secret nick name",
					transform: function(value) {
						return decypherSecretNickname(value);
					}
                }
            },
            handler: function(req,callback){
                userCtrl.list(req.filters, callback);
            }
        }
//...
```

#### 3.2.5 Filter aliases

Some of the Brest plugins may automatically bind filters to the requests in one way or another.
If you want to redefine the name of such filter, but you don't have an access to the responsible plugin or
renaming on plugin side is impossible, you can use "filterAlias" API property

```javascript
	{
		filterAlias: {"bar": "long_and_ugly_autogenerated_filter_foo"}
	}
```

This will automatically rename "bar" URL parameter into "long_and_ugly_autogenerated_filter_foo", so it could be picked by
the autogenerated filter named "long_and_ugly_autogenerated_filter_foo".

Same can be achieved in a different manner:

```javascript
	{
		filters: {"long_and_ugly_autogenerated_filter_foo": {"alias": "bar"}}
	}
```

Mind that latter usage may not be usable depending on how and at which point the filters are autogenerated

### 3.3 Logging requests

Brest uses [mogran](https://github.com/expressjs/morgan) library to log requests. Starting from v0.1.10 it is
possible to adjust logging as follows:

- default: *true*
- boolean: *false* disables logging, *true* enables with default settings ('combined' format, no additional options)
- string: will load corresponding format without any additional settings.
- morgan instance: use pre-initialized morgan instance.
- object: {\<%format%>: {\<%settings%>}}. Load **morgan(\<%format%>, \<%settings%>)**

## 4 Events

Brest instance, once setup emits various events, that can be used to further extend it's functionality.

- **ready**: Brest has successfully initialized express and http server and ready to proceed with further initializations.
 As most of the Brest extensions are either loading express middlware or require initialized express instance it is reasonable to
 proceed with extensions initializations once this event fires:

 ```javascript
         var brest = new Brest(settings);

         brest.on('ready', function() {
         	            brest.use(
                            [   BrestValidate,
                                BrestJaySchema,
                                BrestPassport]);
         }
 ```

 - **extensionsLoaded**: all extensions passed to brest.use have been initialized. At this point API path is to be bound.

  ```javascript
	brest.on('extensionsLoaded', function() {
	    	brest.bindPath(settings.server.api, function(err){
		        	if (err) {
				            log.debug(err);
			        }
	        });
	});
  ```

  - **closing**: Brest is shutting down, but it still has some matters to attend. If you need to catch the moment pass which
   you shouldn't do anything with Brest, you should catch this event.

  - **closed**: Brest is lying dead and waiting for garbage collector. If you need to clean up references to the Brest instance, you
  can do it from here.

  - **counter**: Some counter has reached the predefined point. The counters can be set up in Brest settings as follows:
  ```javascript
  {
     emitCounterEventOn: {
        in: [100, 1000, 1701], // Emit counter event every 100, 1000 and 1701 incoming request
        out: [42] // Emit counter event every 42 requests served
        process: [64, 128] //Emit on 64 or 128 concurrent requests being served
     }
  }
  ```

  As a parameter event listener receives an object {<counter_key>: <counter_value>}. The following counter keys are now being used:

*in*: Counter is increased for every incoming request, before it is processed.

*out*: Counter is increased for every outcoming responce, after all processing is done.

*process*: Counter is increased for evety incoming request and decreased for every responce sent back to client. Thus it represents
the number of concurrent requests and can be used to estimate current load.

- **error**: Something wrong has happened. Event listener receives error object as a parameter.

## 5 Extensions

### 5.1 Current

#### Authentication

[Passport](https://github.com/MaximTovstashev/brest-passport) Authenticating user with PassportJS

#### Database handling

- [MySQL](https://github.com/MaximTovstashev/brest-mysql) MySQL
- [PostgreSQL](https://github.com/MaximTovstashev/brest-pg) PostgreSQL (work in progress)

#### Validation
- [Jayschema](https://github.com/MaximTovstashev/brest-jayschema) JaySchema POST Json Schema validation
- [Validation](https://github.com/MaximTovstashev/brest-validate) Request params validation

#### Secutiry

- [Limiter](https://github.com/MaximTovstashev/brest-redis-limiter) Request limiter using redis db and
express-limiter library


### 5.2 Obsolete

- [Docker](https://github.com/MaximTovstashev/brest-docker) Extension automatically builds documentation for the Brest API function.
This extension is currently not supported.
- [MariaDB](https://github.com/MaximTovstashev/brest-maria) MariaDB (abandoned, use MySQL instead!)

## Changes

#### 0.2.5

- ESLint introduced
- API URL options added

#### 0.2.4

- Fixed 'toobusy' bug and updated default settings

#### 0.2.3

- CORS now utilizes express.js middleware and supports pre-flight requests.

#### 0.2.2

- Added CORS headers support
- More refactoring towards ES2015 standards

#### 0.2.1

- Fixed issue with multiple API files crashing the startup
- Some inner refactoring

#### 0.2.0

- Inner objects are now ES6 classes
- Filter transformations are now separate clases
- Fixed issue with event listeners being initialized after the events are fired
- Added "min", "max", and "clamp" filter parameters

#### 0.1.16-1

- Fixed: Skips "include" field, if found in filters

#### 0.1.16

- "toBoolean" transformation function fixed

#### 0.1.15

- Added "filterAlias" API parameter to create filter shortcut. You can also use an "alias" filter parameter
(String or String[]) for the same purpose
- Added "default" filter parameter
- Added "toFinite", "toInteger", "toNumber", "toBoolean" transformation functions
- Added "override" filter parameter. If *true* the filter added by third party will rewrite filter in API.
Otherwise, defaultsDeep will be used.

#### 0.1.14

- toArray filter param now explodes string value to array
- toUpperCase filter param no longer fires if filter description is a string
- Introduced "reject" method description field
- "error" field in error reply now has lowercase key (before: Error → now: error)

#### 0.1.13

- Introduced "obsolete" method description field.
- Filter transformation options added

#### 0.1.12

- Unauthorized request will now return 401 instead of 403.
- Authentication extensions now should return "false" or castable to "false" if no error is found,
and an error object in case of error.

#### 0.1.11

- Brest now emits 'error' event on all errors

#### 0.1.10

- Fixed issue with description field overriden. Now plugins are supposed to use "getField('name')" instead
of "method.description['name']" and "getFields()" instead of "method.description" where appliable.
- Morgan loggins is now adjustable with settings.log field (see "Logging")
- brest.getSetting now uses [_.get()](https://lodash.com/docs#get), which means some more sintax variations in addition
to existing ones. Please, refer to lodash tutorial for details.
- Function that gets methods verb is now called "getVerb()" not "getMethod()"

#### 0.1.9

- Enable/disable conditions
- Response fields screening (currently for noAuth case only. Role screening en route)
- Path description fields are not limited to the predefined list, nor the required fields are checked. However,
the default HTTP method is GET and if handler is skipped, empty handler which returns error is used instead.
- It is now possible to add new replacement keys to replaceMe (settings: replaceMe)
- getBrest() method in available in Method and Path objects. Usable in plugins.
- TooBusy now returns 429 code instead of 503
- Fixed issue with incorrect settings format crashing the application
- Fixed "Authentication failed" error message

#### 0.1.8-3

- Toobusy settings: fixed 'interval' setting, added 'enabled' setting

#### 0.1.8-2

- Rolled back bugfix for 0.1.8-1 as it breaks usage of arrays in counters setup
- Toobusy can be now provided with settings (see https://www.npmjs.com/package/toobusy-js)

#### 0.1.8-1

- Fixed bug with counter not being reset;

#### 0.1.8

- brest.getPort() method added
- brest.close() now has safeguard from multiple calls
- express request logging can be switched off with log:false setting
- overloading safeguard added
- lesser changes

#### 0.1.7

- Extensions now can have separate init functions for resources and methods
- Resources and methods now emit "ready" and "error" events (can be caught in extensions)
- Async resource and methods initialization (no actual changes outside)
- Some code refactoring

#### 0.1.6

- Added new events
- Introduced counters

#### 0.1.5-3

-  fixed undefined var for req.include

#### 0.1.5-2

- Settings defaults are using deep copy

#### 0.1.5-1

- Some colors added
- Brest.close() method added. Closes server, emits "closing" on start and "closed" on finish
- New event emitters "closing" and "closed"

#### 0.1.5

- Fixed issues with Multer initialization
- Took new features from bmrest fork
- "noCache" method parameter (bmrest) will sent no-caching headers
- "toArray" filter parameter will cast filter value to array if it's not an array already
- "include" method parameters (bmrest compat.) will add "include" array to request object

#### 0.1.4-1

- Fixed issue with Express crashing on empty return

#### 0.1.4

- It is now possible to bind multiple API paths
- Fixed some obsolete Express methods calls

#### 0.1.3

- Multer fix

#### 0.1.2

- It is now possible to use callbacks for file downloads
- Fixed bug with multiple extension loading
- Changed authenticate callback check from _.isUndefined to _.isNull

#### 0.1.1

- Async module initialization

#### 0.1.0

- Moved express initialization into the bREST logic.
- Moved validation into the extensions
- Moved authentication into the extensions

#### 0.0.5

- File downloads added. Use response options "file" to send file to download and optional "fileName"
to define filename. Please note, that you won't be able to retrieve files using Ajax due to safety restrictions.

#### 0.0.4-6

- Response options added

#### 0.0.4-5

 - Now it is possible to define auto-replacement for "me" filter value
 - Documentation update

#### 0.0.4-4

 - Changes in settings handling.
 - Documentation update

#### 0.0.4-3

When no filters are defined, *req.filters* is an empty Object, not undefined property.

#### 0.0.4-2

Documentation update.

#### 0.0.4-1

Fixed issue with loading JSON-schema files.

### 0.0.4

Fixed issue with URL parameters passed to method with no described filters.

### 0.0.3

First working version.

## MIT License

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
