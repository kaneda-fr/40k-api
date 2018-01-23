'use strict';

var fs = require('fs'),
    path = require('path'),
    http = require('http');

var app = require('connect')();
var swaggerTools = require('swagger-tools');
var jsyaml = require('js-yaml');
var serverPort = 8080;


var mongoose = require('mongoose'),
	// param = require("./Common/node/paramTypes.js"),
	colors = require('colors'),
	config = require('./config'),
	util = require('util'),
	db = mongoose.connection;

db.on('error', function() {
	console.log('Database connection error'.red);
});
db.on('connecting', function () {
	console.log('Database connecting'.cyan);
});
db.once('open', function() {
	console.log('Database connection established'.green);
});
db.on('reconnected', function () {
	console.log('Database reconnected'.green);
});

mongoose.connect(config.db_url, {server: {auto_reconnect: true}});

var FB = require('fb');
FB.options({version: 'v2.11'});

// swaggerRouter configuration
var options = {
  swaggerUi: path.join(__dirname, '/swagger.json'),
  controllers: path.join(__dirname, './controllers'),
  useStubs: process.env.NODE_ENV === 'development' // Conditionally turn on stubs (mock mode)
};

// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
var spec = fs.readFileSync(path.join(__dirname,'api/swagger.yaml'), 'utf8');
var swaggerDoc = jsyaml.safeLoad(spec);

// Initialize the Swagger middleware
swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {

  // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
  app.use(middleware.swaggerMetadata());

  // Provide the security handlers
  app.use(middleware.swaggerSecurity({
    FBApiKeyAuth: function (req, authOrSecDef, scopesOrApiKey, cb) {
      // your security code
      // console.log('scopesOrApiKey ' + scopesOrApiKey);
      // console.log('authOrSecDef ' + JSON.stringify(authOrSecDef));

      if (scopesOrApiKey === undefined) {
        cb(new Error('Missing API Authentication Header'));
        return;
      }

      var userId = scopesOrApiKey.split('----')[0];
      var fbToken = scopesOrApiKey.split('----')[1];
      // console.log('Id: ' + userId);
      // console.log('Token: ' + fbToken);
      FB.setAccessToken(fbToken);
      FB.api('me', { fields: ['id'] }, function (res) {
        if(!res || res.error) {
          console.log(!res ? 'error occurred' : res.error);
          cb(new Error(!res ? 'error occurred' : res.error));
          return;
        }
        
        if (res.id === userId){
            cb();
        } else {
          cb(new Error('FB userID mismatch: ' + userId + ' -- ' + res.id));
        }

        //console.log('name: ' + res.name);
      });
    }
  }));

  // Validate Swagger requests
  app.use(middleware.swaggerValidator());

  // Route validated requests to appropriate controller
  app.use(middleware.swaggerRouter(options));

  // Serve the Swagger documents and Swagger UI
  app.use(middleware.swaggerUi());

  // Start the server
  http.createServer(app).listen(serverPort, function () {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
  });

});
