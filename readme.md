![Brest](./assets/logo.png)
# Better REST over express.js

Brest is a (relatively) simple REST API library over [express.js](http://expressjs.com/). 

[![npm version](https://badge.fury.io/js/brest.svg)](https://badge.fury.io/js/brest)
![CircleCI](https://circleci.com/gh/MaximTovstashev/brest.svg?style=shield&circle-token=8960d8372f5c35839baa462ce43b08b803eaea4b)

## Table of contents

<ul>
	<li><a href='#migration'>Migration</a></li>
	<li><a href='#how-do-i-use'>Guide</a>
	<ul>
			<li><a href="#ch1">1. Install from package manager</a></li>
			<li><a href="#ch2">2. Setup</a>
			<ul>
				<li><a href="#ch2.1">2.1 Application file</a></li>
				<li><a href="#ch2.2">2.2 Brest working directories</a></li>
				<li><a href="#ch2.3">2.3 Registering paths</a>
				<ul>
					<li><a href="#ch2.3.1">2.3.1 Possible response options</a></li>
					<li><a href="#ch2.3.2">2.3.2 Using handlers with Promises</a></li>
					<li><a href="#ch2.3.3">2.3.3 Asyncronous Resource initialization</a></li>
				</ul></li>
				<li><a href="#ch2.4">2.4 Settings</a></li>
				<li><a href="#ch2.5">2.5 Enable/disable conditions</a>
				<ul>
					<li><a href="#ch2.5.1">2.5.1 Conditions setup</a></li>
				</ul></li>
			</ul></li>
			<li><a href="#ch3">3 Serving requests</a>
			<ul>
				<li><a href="#ch3.1">3.1 Supported methods</a></li>
				<li><a href="#ch3.2">3.2 Request URL parameters</a>
				<ul>
					<li><a href="#ch3.2.1">3.2.1 Basic handling</a></li>
					<li><a href="#ch3.2.2">3.2.2 Filtering</a></li>
					<li><a href="#ch3.2.3">3.2.3 Complex filter descriptions</a></li>
					<li><a href="#ch3.2.4">3.2.4 Filter transformations</a></li>
					<li><a href="#ch3.2.5">3.2.5 Filter aliases</a></li>
				</ul></li>
				<li><a href="#ch3.3">3.3 Uploading files</a></li>				
				<li><a href="#ch3.4">3.4 Logging requests</a></li>							
			</ul></li>
			<li><a href="#ch4">4 Events</a></li>
			<li><a href="#ch5">5 Extensions</a>
			<ul>
				<li><a href="#ch5.1">5.1 Current</a></li>
				<li><a href="#ch5.2">5.2 Obsolete</a></li>
			</ul></li>
		</ul></li>
	<li><a href='#tests'>Tests</a></li>	
	<li><a href='#changes'>Changes</a></li>	
	<li><a href='#license'>License</a></li>	
</ul>

## <a name="migration"></a>Migration

Brest v.0.4 is going to be the last minor version before 1.0 release. The aim of 0.4.x branch is to prepare for the 
v1.0 release: with bugs fixed, proper tests and documentation covering all aspects of using Brest in production environment.
 
The backwards compatibility will remain through all 0.4.x releases. The oblosete features will work, but with warnings.
 Any feature that causes "deprecated" warning will be dropped in Brest 1.0

## <a name="how-do-i-use"></a>Guide

### <a name="ch1"></a>1. Install from package manager

In project route

    $ npm install brest --save

You don't have to install `express.js` separately. It is included into `Brest` dependencies. However, you might want to
initialize `express.js` outside of `Brest` on some occasions.

### <a name="ch2"></a>2 Setup
#### <a name="ch2.1"></a>2.1 Application file

In your application file:

```javascript
	// Require brest library
	const Brest = require('brest');
	const brest = new Brest(require('%path_to_settings%'));
```

If you want to use pre-initialized `express.js` and `app()`, you provide them as additional parameters to Brest:

```javascript
	// Require brest library
	const Brest = require('brest');
	const express = require('express');
	
	const app = express();
	const brest = new Brest(require('%path_to_settings%'), express, app);
```

#### <a name="ch2.2"></a>2.2 Brest working directories

By default, Brest uses `./api/` path for the `Resource` files. Different path for the `Resource` files can be provided in settings `apiPath` parameter, or
by calling 

```javascript
brest.bindPath([API_PATH, ADDITIONAL_API_PATH, /*...*/]);
```

For each path provided, `Brest` will go through all `.js` files in the folder, attempting to aquire `Resource` descriptions.

#### <a name="ch2.3"></a>2.3 Registering paths

The API URL made with `Brest` can be separated into the following parts:
 
**`[METHOD]`** `[Host] <Prefix> <Version> [Resource] {Endpoint}`
 
- **`[METHOD]`** is HTTP Endpoint, like **`GET`** or **`POST`**. You're expected to use **`GET`** for retrieving resources, **`POST`** for creating new resources,
**`PUT`** for updating existing resources and **`DELETE`** for deleting them, but that's not a strict rule. 
You can limit to **`GET`** and **`POST`** or to any other set of HTTP verbs of your choice
- `[Host]`. It is your server host. Like `example.com` or `127.0.0.1:8080`
- `<Prefix>`. Arbitrary string to precede the rest of your URI. It is empty by default an can be assigned through `api_url.prefix` setting
- `<Version>`. API version. By default it is `/v1/`. It is set through `version` field in `Resource` file description and can be switched off via `api_url.unversioned` setting.
- `[Resource]`. The resource your API exposes access to. Like `user` or `package`. For the `Resource` part of the URI the `Resource` file name is used. Since 0.4.6 it can be overridden via "noun" Resource description parameter.

API resource are expected to export object files with the following structure:

```javascript
module.exports = {
    version: 1,
    description: 'Resource description', //Description for the possible documentation engines    
    endpoints: [
        //List of the endpoint objects
    ]
}
```

Here, the version property and the filename define the beginning of the endpoints' URI. For instance, if API object from ./api/persons.js has property version: 1, the URI will start with /v1/user. 

Overriding resource name: 

```javascript
module.exports = {
    version: 1,
    noun: 'new_name',
    description: 'Resource description', //Description for the possible documentation engines    
    endpoints: [
        //List of the endpoint objects
    ]
}
```

After that, the resource objects description is used:

Endpoint object has the following structure (properties placed alphabetically):

```javascript
const endpoint =  
{
	allowCORS: false, //default: false. Allow CORS for this endpoint

	description: 'Some description goes here', //Description for the Docker
	
	disabled: {environment: 'dev'}, //Disable condition. See 2.5 Enable/disable conditions
	
	enabled: ['foobar'], //Enable condition. See 2.5 Enable/disable conditions
	
	/**
	 * Handler function: receives Express JS object and a callback function.
	 * If no handler provided, blank handler will return error
	 */
	handler: function(req, callback) {
		callback(err, result, options);
	},
	
	method: 'POST', //default: GET. HTTP method required.
	
	middle: [], //Custom middleware for the endpoint
	
	noAuth: false, //default: false. If true, no authentication is needed for this resource
    
	/**
	 * Obsolete endpoint flag
	 * If true, warning message is written to console each time the endpoint is called
	 * Optionally can be a string with proposed new uri
	 */
	obsolete: true|"new/uri",
	
	reject: ['field1', 'field2'],	  //Unconditionally remove fields from response
	
	screen: {noAuth: ['some_field']}, //Remove fields from response. Currently for noAuth only
	
	stub: false, //default: false. If true, resource returns "Not implemented yet" message.

	upload: {}, //Multer settings object (see 3.3 for details)

	uri: ":fooId", //additional params, if any

}
```

#### <a name="ch2.3.1"></a>2.3.1 Possible response options

Add to the response object for the handler callback

**ignoreJSON** {Boolean} use res.send() instead of res.json() even if return data is object. Can be useful, if you want to send json, as text/html, for some reason.

**code** {Number||String} send response with arbitrary code

**headers** {Object} Set headers from `{('key': 'value')}` object.

**cookies** {Array} Set cookies {name: "name", value: "value", options: {Object}}

**file** {String} Send file to user.

**fileName** {String} Provide this file with specific name.

**fileCallback** {String} Specify function to call when user has finished downloading.

**autoUnlink** {Boolean} When `true` the file is automatically unlinked after user has finished downloading. Unlink is
called prior to calling `fileCallback`, and `fileCallback` will receive unlink error if one has occured.

**autoMime** {Boolean} When `true` attempts to assign `content-type` to the downloaded file automatically

**redirect** {String} Redirect user to given URL

####<a name="ch2.3.2"></a>2.3.2 Using handlers with Promises

Instead of using callback, you can return Promise from your handler. If you have to use options in this case, include
them into result object with `$options` key. `$options` will be removed from resulting JSON sent to user.

####<a name="ch2.3.3"></a>2.3.3 Asyncronous Resource initialization

When resource file contains `async` property it is expected to be the asyncrohous function that takes callback as a single
parameter and returns description with callback.

```javascript
	const resource_data = {
  		endpoints: {
  		  //...
  		}
	};

	const resource = {
  		async: (callback) => {
  		  callback(null, resource_data);
  		}
	}
```

### <a name="ch2.4"></a>2.4 Settings

Certain default settings may be overridden by providing user settings. Settings object is passed to the brest() as
the second parameter.

```javascript
    const settings = {
        application: "%app_name%",      // Application name
        environment: "dev",             // Environmen type
        apiPath: './api',				// Path to resource folder
        basePath: '%base_app_path%',	// Override default require.main.filename base path. Might be
        								// usable with something like github.electron
        								
        version: 1,                     // API default version
        server: {
            port: 8080,                  // Listed on port
            defaultHTML: 'path/to/default/html/file'
        },
        static: {
            public: "public",            // Public folder path
			index: "index.html",		 // Default file
			mountPath: "static/",		 // Path prefix for the static
			options: {}					 // See https://github.com/expressjs/serve-static options					
        },
        apiUrl: {
          	prefix: 'api/',				// Prepend url with leading string.
          	unversioned: true			// Don't include API version into the URL (default false)
        },
        before_static_init: (express, app) => {}, //Function to be called before static route is setup
        after_static_init: (express, app) => {}   //Function to be called after static route is setup
    }

```

### <a name="ch2.5"></a>2.5 Enable/disable conditions

Path objects can be enabled or disabled by certain settings conditions.

**enabled** property defines which settings are
 required for the path to be used. **ALL** conditions must be met in order for path to be used.

**disabled** property is responsible for switching off the path. **ANY** condition must be met for the path to be
  disabled.

First enabled conditions are checked, and then disabled conditions are checked. Which means, if settings meet both
conditions, the path will be disabled disregarding 'enabled' condition.

####<a name="ch2.5.1"></a>2.5.1 Conditions setup

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
const settings = {
   //...
   property_pingable: {
       foobar: true
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


## <a name="ch3"></a>3 Serving requests

### <a name="ch3.1"></a>3.1 Supported methods

The following methods are being supported by Brest:

```
GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH, TRACE
```

If the request is send to existing URI with undefined method (say, you have **`GET`**`/v1/kittens` and **`POST`**`/v1/kittens`, but
you try to **`DELETE`**`/v1/kittens`) Brest will respond with `405` error code and response header will contain `Allow: GET, POST`.

###<a name="ch3.2"></a>3.2 Request URL parameters
####<a name="ch3.2.1"></a>3.2.1 Basic handling
Request parameters can be passed both as a part of the path and the query string. Path parameters are described in
"uri" property of resource description object:

```
	uri: '/floor/:floorId/room/:roomId'
```

Here `:floorId` and `:roomId` are path parameters and they would be accessible in `req.params` object as `req.params.floorId`
and `req.params.roomId` respectively.

#### <a name="ch3.2.2"></a>3.2.2 Filtering
Query strings are supposed to be described in *filters* property:

```
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

#### <a name="ch3.2.3"></a>3.2.3 Complex filter descriptions
These properties description are used by documentation creation scripts to create detailed description of the resource. You can also use
user data replacement:

```javascript
//  api/persons.js
//...
const resource = 
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

In this case, if `/v1/api/user?subscribed\_to=me` is called, `req.filters.subscribed\_to` with be equal to `req.user.id`.
If user in not authenticated or req.user doesn't contain `['id']` property, `403` error would be returned by server.

By default 'me' and 'mine' are replaced with current user id. It is possible to add more replacements by 'replaceMe'
setting. (e.g. `settings.replaceMe = ['own', 'private']`).

#### <a name="ch3.2.4"></a>3.2.4 Filter transformations

It is possible to automatically transform filter values. The following transformations can be used:

- *toArray*: transform comma-separated string into array. If provided with string value, it will be used as custom separator. 
This transformation is made **before** any other. Unless stated otherwise, transformation filters will be applied to each array element separately.
- *fromJSON*: accept valid JSON string and parse it into object. `HTTP 422` will be returned in case of invalid JSON
- *toLowerCase*: transform filter value to lower case
- *toUpperCase*: transform filter value to upper case
- *toInteger*: transform filter value to integer
- *toNumber*: transform filter value to number
- *toBoolean*: transform filter value to boolean. Note, that strings *`"false"`* and *`"0"`* are cast to boolean **false**
- *min*, *max*: limit numeric filter value. Consider using transformation to number with this parameters.
- *clamp*: takes array of [min, max], ensures value stays between these numbers. Pre-cast to number is recommended as well. 
- *transform*: provide custom transformation synchronous function
- *detach*: remove filter from req.filters into separate Request object property. If `detach === true`, the parameter name
is the same as filter name. E.g. in case of `filters: {foo: {detach: true}}` with `?foo=bar` request you will receive
 `req.foo === bar`. If `detach === 'some_string'`, the filter will be detached into `req['some_string']`. Attempt to detach
 into existing Request object property, like `req.query` would result in `HTTP 500` response.

Please, note, that transform filters are always applied before value limit filters and custom transform is applied the last.

```javascript
//...
const endpoint =
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

#### <a name="ch3.2.5"></a>3.2.5 Filter aliases

Some of the Brest plugins may automatically bind filters to the requests in one way or another.
If you want to redefine the name of such filter, but you don't have an access to the responsible plugin or
renaming on plugin side is impossible, you can use "filterAlias" API property

```
	{
		filterAlias: {"bar": "long_and_ugly_autogenerated_filter_foo"}
	}
```

This will automatically rename "bar" URL parameter into "long_and_ugly_autogenerated_filter_foo", so it could be picked by
the autogenerated filter named "long_and_ugly_autogenerated_filter_foo".

Same can be achieved in a different manner:

```
	{
		filters: {"long_and_ugly_autogenerated_filter_foo": {"alias": "bar"}}
	}
```

Mind that latter usage may not be usable depending on how and at which point the filters are autogenerated


###<a name="ch3.3"></a>3.3 Uploading files

Brest uses [multer](https://github.com/expressjs/multer) middleware to accept multipart requests, which are primary
used for uploading files.

In order to make API endpoint accept files, use `upload` field in resource description. The basic usage requires only
`dest` parameter, defining the upload destination:

```javascript
const resource = 
{
	//...
	  upload: {
	    	dest: 'uploads/'
	  }
}
```

You can use `fieldname` or `fieldnames` parameter as described in [multer](https://github.com/expressjs/multer) documentation.

There's also a shortcut for renaming a single uploaded file:

```javascript
const resource = 
{
	//...
	  upload: {
		destination: function (req, file, cb) {
			cb(null, getUploadDestination(file));
		},
		filename: function (req, file, cb) {
			cb(null, getNewFileName(file));
		}
	  }
}
```

Which is basically the same as using `multer.diskStorage` with the same options.

You can get full control over your setup by using function instead of object. The function should accept multer module
as a single parameter and return a set up middleware:

```javascript
const resource = 
{
  //...
  upload: {
    function(multer) {
      return multer({
      	dest: 'upload/'
      });
    }
  }
}
```


### <a name="ch3.4"></a>3.4 Logging requests

Brest uses [mogran](https://github.com/expressjs/morgan) library to log requests. Starting from v0.1.10 it is
possible to adjust logging as follows:

- default: *true*
- boolean: *false* disables logging, *true* enables with default settings ('combined' format, no additional options)
- string: will load corresponding format without any additional settings.
- morgan instance: use pre-initialized morgan instance.
- object: {\<%format%>: {\<%settings%>}}. Load **morgan(\<%format%>, \<%settings%>)**

## <a name="ch4"></a>4 Events

Brest instance, once setup emits various events, that can be used to further extend it's functionality.

- **ready**: Brest has successfully initialized express and http server and ready to proceed with further initializations.
 As most of the Brest extensions are either loading express middlware or require initialized express instance it is reasonable to
 proceed with extensions initializations once this event fires:

 ```javascript
         const brest = new Brest(settings);

         brest.on('ready', function() {
         	            brest.use(
                            [   BrestValidate,
                                BrestJaySchema,
                                BrestPassport]);
         });
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
  
  - **before_api_init**: Event is called before starting binding the paths
  - **after_api_init**: Event is called after successfully finishing binding the paths
  
  Please, note, that these events would be called for each `Brest.bindPath` call. 

  - **closing**: Brest is shutting down, but it still has some matters to attend. If you need to catch the moment pass which
   you shouldn't do anything with Brest, you should catch this event.

  - **closed**: Brest is lying dead and waiting for garbage collector. If you need to clean up references to the Brest instance, you
  can do it from here.

  - **counter**: Some counter has reached the predefined point. The counters can be set up in Brest settings as follows:
  ```
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

## <a name="ch5"></a>5 Extensions

### <a name="ch5.1"></a>5.1 Current

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


###<a name="ch5.2"></a>5.2 Obsolete

- [Docker](https://github.com/MaximTovstashev/brest-docker) Extension automatically builds documentation for the Brest API function.
This extension is currently not supported (and has nothing to do with Docker container management)
- [MariaDB](https://github.com/MaximTovstashev/brest-maria) MariaDB (abandoned, use MySQL instead!)

##<a name="tests"></a>Tests


To run the test suite, first install the dependencies, then run npm test:
```bash
$ npm install
$ npm test
```

## <a name="changes"></a>Changes

#### 1.0.0.aplha.2
- Endpoint URI is more smart regarding extra slashes now
- Added static options
- Static path now has to be absolute (for the sake of similarity with API dir path)
- Added `autoUnlink` option for the file download
- Added `autoMime` option to allow automatic Mime type lookup (by extension)
- `Content-disposition` header is sent alongside the downloading file
- Added warning when attempting to use non-existing or unreachable static files path
- Fixed issue with counters working incorrectly on file download and redirections

#### 1.0.0.aplha.1
- Async loading

#### 0.4.10
- Fixed issue with returning error on empty Promise.resolve

#### 0.4.9
- Added "afterHandler" extension hook

#### 0.4.8
- Added check for invalid extensions list in `Brest` constructor

#### 0.4.7
- External express() and app should now be passed within `Brest` options
- Extensions can be passed as a second parameter, if they require pre-ready initialization
- Bodyparser is initialized globally by default
- Resource.endpoints and Resource.uri are now exposed as getters
- Brest.resources is now exposed as getter
- Async resource init now checks for empty callback result

#### 0.4.6
- Resource names can be overridden with `noun` parameter
- Resources can be loaded asyncronously
- Fixed bug with error reporting from resource binding

#### 0.4.5
- Exceptions in filter transformations are now handled correctly
- Added "fromJSON" filter transformation
- Removed "Transform.isBoolean()" method as misleading
- apiUrl setting now has uniform capitalization (snake_case is still valid)
- Filters now can be detached into separate req[%field_name%] fields

#### 0.4.4
- Base directory can be overridden via settings
- Fixed bug with attempt to detach options from null Promise.resolve

#### 0.4.3
- Brest can accept express/app instances initialized outside. 

#### 0.4.2
- Event emission for initializing API with settings is now adjustable

#### 0.4.1
- Fixed pure number and string responses being treated incorrectly

#### 0.4.0 ["Chapaev"](https://en.wikipedia.org/wiki/Vasily_Chapayev)
- Method class is now called Endpoint in order to prevent confusion with HTTP methods
- [Intel](https://github.com/seanmonstar/intel) module is now responsible for logging
- Working examples
- Test coverage
- Fixed Clamp() transformation name
- Fixed array transformation
- Fixed typecast and string transformations begin applied with own parameter set to "false"
- Fixed issue with apiPath setting not working correctly
- Fixed issue with bindPath not calling callback in case of success binding

#### 0.3.3
- Fixed bug with bindPath not calling callback in certain cases

#### 0.3.2

- Fixed bug with favicon description
- Fixed bug with `reject` directive
- Updated documentation
- Updated `package.json` dependencies versioning

#### 0.3.1

- Fixed bug with undefined "handlerPromise"

#### 0.3.0

- Fixed bug with unauthorized "me" property use
- Fixed typo in undefined handler error message
- Handler can now return promise instead of using callback

#### 0.2.7

- Added more initialization events

#### 0.2.6

- Fixed API prefix

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
- getBrest() method in available in Endpoint and Path objects. Usable in plugins.
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

##<a name="license"></a>MIT License

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
