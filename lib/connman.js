"use strict";

var util = require('util');
var events = require('events');
var async = require('async');
var DBus = require('dbus');
var Agent = require('./agent');
var Technology = require('./technology');
var Wired = require('./wired');
var Wifi = require('./wifi');
var Bluetooth = require('./bluetooth');
var debug = require('debug')('connman');

var dbus = new DBus();

var DEFAULT_TIMEOUT = 10000;

var ConnMan = module.exports = function() {
	var self = this;

	self.dbus = dbus;
	self.systemBus = dbus.getBus('system');
	self.manager = null;
	self.connections = {};
	self.technologies = {};
};

util.inherits(ConnMan, events.EventEmitter);

ConnMan.prototype.init = function(callback) {
	var self = this;

	// Getting Connection Manager DBus Interface
	self.systemBus.getInterface('net.connman', '/', 'net.connman.Manager', function(err, iface) {
		if (err) {
			if (callback) callback(new Error('Cannot connect to connection manager: ' + err));
			return;
		}
        
		self.manager = iface;
        
        // Start listening for signals from the Manager API
        // Also see: https://git.kernel.org/cgit/network/connman/connman.git/tree/doc/manager-api.txt#n197
        
		// Called when Manager properties like State, Offline and SessionMode change. 
		iface.on('PropertyChanged', function(name, value) {
            debug("PropertyChanged: ",name,value);
			self.emit('PropertyChanged', name, value);
		});
        // Called when a technlogy, like wired or wifi are added.
        iface.on('TechnologyAdded', function(name,properties) {
            debug("TechnologyAdded: ",name,properties);
            self.emit('TechnologyAdded', name, properties);
            // ToDo: update technologies
		});
        // Called when a technlogy, like wired or wifi are removed.
        iface.on('TechnologyRemoved', function(name) {
            debug("TechnologyRemoved: ",name);
            self.emit('TechnologyRemoved', name);
            // ToDo: update technologies
		});
        // Called when services changed. 
        // Services are the wired connection, all possible wifi networks etc
        iface.on('ServicesChanged', function(changes,removed) {
            debug("ServicesChanged: ");
//            debug("  Added: \n",Object.keys(added[0]));
//            if(removed.length > 0) {
//                debug("  Removed: \n",removed);
//            }
            self.emit('ServicesChanged', changes[0],removed);
		});
        
		// Update technologies
		self.getTechnologies(function() {

			// Initializing agent
			self.Agent = new Agent(self);
			self.Agent.init(function() {
				if (callback)callback();
			});
		});
	});

};

// Get WiFi / Wired interface for service
ConnMan.prototype.getConnection = function(serviceName, callback) {
	var self = this;
    // Retrieve from cache?
	if (self.connections[serviceName]) {
		process.nextTick(function() {
			callback(null, self.connections[serviceName]);
		});
		return;
	}
	// Find out current service we're using
	self.getServices(function(err, services) {
        var service = services[serviceName];
		var conn = null;
		if (!service) {
			callback(new Error('No such service'));
			return;
		}
		switch(service.Type) {
            case 'ethernet':
                conn = new Wired(self);
                conn.init(serviceName, function(err) {
                    if(err) return callback(err);
                    self.connections[serviceName] = conn;
                    callback(null, conn);
                });
                break;
            case 'wifi':
                conn = new Wifi(self);
                conn.init(serviceName, function(err) {
                    if(err) return callback(err);
                    self.connections[serviceName] = conn;
                    callback(null, conn);
                });
                break;
            default:
                callback(new Error("No suitable interface found for '"+service.Type+"'"));
                break;
		}
	});
};

ConnMan.prototype.getProperties = function(callback) {
	var self = this;
	var mgr = self.manager;
    if(!callback) return;
	mgr.GetProperties.timeout = DEFAULT_TIMEOUT;
	mgr.GetProperties.error = callback;
	mgr.GetProperties.finish = function(props) { callback(null, props); };
	mgr.GetProperties();
};

ConnMan.prototype.setProperty = function(prop, value, callback) {
	var self = this;
	var mgr = self.manager;

	mgr.SetProperty.timeout = DEFAULT_TIMEOUT;
    if(callback) {
        mgr.SetProperty.error = callback;
        mgr.SetProperty.finish = callback;
    }
	mgr.SetProperty(prop, value);
};

// Get services info (to retrieve the javascript interface use getConnection)
ConnMan.prototype.getServices = function() {
	var self = this;
	var mgr = self.manager;

	var type = null;
	var callback = null;
	if (arguments.length == 1) {
		callback = arguments[0];
	} else {
		type = arguments[0];
		callback = arguments[1];
	}

	if (!callback) return;

	mgr.GetServices.timeout = DEFAULT_TIMEOUT;
	mgr.GetServices.error = callback;
	mgr.GetServices.finish = function(services) {
        if(!services instanceof Array) return callback(new Error("Invalid services list"));
		
        if (services.length == 0) return callback(null, {});

        if (!type) {
            for (var serviceName in services[0]) {
                var service = services[0][serviceName];
                service.serviceName = serviceName;
            }

            callback(null, services[0]);
            return;
        }

        var filteredServices = {};
        for (var serviceName in services[0]) {
            if (services[0][serviceName].Type != type) 
                continue;

            var service = services[0][serviceName];
            service.serviceName = serviceName;
            filteredServices[serviceName] = service;
        }

        callback(null, filteredServices);
	};
	mgr.GetServices();
};

ConnMan.prototype.getTechnologies = function(callback) {
	var self = this;
    if (!callback) return;
    self.getAllTechnologyInfo(function(err,technologies) {
        if(err) return callback(err);
        if (technologies.length === 0) return callback(null, {});
        
        async.eachSeries(Object.keys(technologies), function(techName, next) {
            var techInfo = technologies[techName];
            
            // This technology exists already
            if (self.technologies[techName]) return next(); 

            // Initializing technology object
            var technology = new Technology(self, techInfo.Name, techInfo.Type);
            technology.init(function() {
                self.technologies[techInfo.Name] = technology;
                next();
            });
            
        }, function(err) {
            callback(err, self.technologies);
        });
    }); 
};

ConnMan.prototype.getAllTechnologyInfo = function(callback) {
	var self = this;
	var mgr = self.manager;

	if (!callback) return;

	mgr.GetTechnologies.timeout = DEFAULT_TIMEOUT;
	mgr.GetTechnologies.error = callback;
	mgr.GetTechnologies.finish = function(technologies) {
        if(!technologies instanceof Array) return callback(new Error("Invalid technologies list"));
        if (technologies.length === 0) {
            callback(null, {});
            return;
        }
        var list = {};
        for (var techPath in technologies[0]) {
            var techInfo = technologies[0][techPath];
            list[techInfo.Name] = techInfo;
        }
        callback(null, list);
    };
	mgr.GetTechnologies();
};

ConnMan.prototype.setOfflineMode = function(enabled, callback) {
	var self = this;

	self.setProperty('OfflineMode', enabled, callback);
};
