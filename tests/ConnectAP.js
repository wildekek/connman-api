var ConnMan = require('../');
var async = require('async');
var targetNetwork = 'your wifi network';

var connman = new ConnMan();
var wifi; 
var serviceData;
var service;

async.series([
    function(next) {
        connman.init(next);
    },
    function(next) {
        // get wifi technology object
        wifi = connman.technologies.WiFi; 
        console.log("perform a scan, just to make sure we have the latest");
        wifi.scan(next); 
    },
    function(next) {
        // get available networks
        console.log("find target network");
        wifi.getServices(function(err, services) {
            if(err) return next(err);
            for(var serviceName in services) {
                if(services[serviceName].Name == targetNetwork) {
                    serviceData = services[serviceName];
                    console.log("found network '"+targetNetwork+"'");
                    next();
                    break;
                }
            }
            if (!serviceData) {
                return next(new Error("Network '"+targetNetwork+"' not found"));
            }
        });
    },
    function(next) {
        // get wifi service object
        connman.getService(serviceData.serviceName, function(err, ser) {
            service = ser;
            next(err);
        });
    },
    function(next) {
        // Connect to that service
        console.log('Connecting ...');
        service.connect(function(err, agent) {
            if (err) return next(err); 
            var failed = false;
            if(connman.enableAgent) {
              agent.on('Release', function() {
                  console.log('Release');
              });
              agent.on('ReportError', function(path, err) {
                  console.log('ReportError:');
                  console.log(err);
                  failed = true;
                  /* connect-failed */
                  /* invalid-key */
              });
              agent.on('RequestBrowser', function(path, url) {
                  console.log('RequestBrowser');
              });
              /* Initializing Agent for connecting access point */
              agent.on('RequestInput', function(path, dict, callback) {
                  console.log(dict);

                  if ('Passphrase' in dict) {
                      callback({ 'Passphrase': '12345' });
                      return;
                  }

                  callback({});
              });
              agent.on('Cancel', function() {
                  console.log('Cancel');
              });
            }
            next();
        });
    },
    function(next) {
        // listen for service property changes
        service.on('PropertyChanged', function(name, value) {
            console.log(name + '=' + value);
            if (name == 'State') {
                switch(value) {
                case 'failure':
                    next(new Error('Connection failed'));
                    break;
                case 'association':
                    console.log('Associating ...');
                    break;
                case 'configuration':
                    console.log('Configuring ...');
                    break;
                case 'online':
                case 'ready':
                    console.log('Connected');
                    next();
                    break;
                }
            }
        });
    },
],function(err) {
    console.log("connect sequence finished ",err || '');
    process.exit();
});