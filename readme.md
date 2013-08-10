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




##Changes

###0.0.4

Fixed issue with URL parameters passed to method with no described filters.

###0.0.3

First working version.