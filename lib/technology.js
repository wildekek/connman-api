/*
 * Javascript interface around Technology API
 * See: https://git.kernel.org/cgit/network/connman/connman.git/tree/doc/technology-api.txt
 *
 * Copyright(c) 2012-2013 Fred Chien <fred@mandice.com>
 *
 */

var path = require('path');
var async = require('async');
var util = require('util');
var events = require('events');
var debug = require('debug')('connman:technology');

var DEFAULT_TIMEOUT = 10000;

var Technology = module.exports = function(connman, name, type) {
	var self = this;

	self.name = name;
	self.type = type;
	self.objectPath = path.join('/', 'net', 'connman', 'technology', self.type);
	self.connman = connman;
	self.iface = null;
};
util.inherits(Technology, events.EventEmitter);

Technology.prototype.init = function(callback) {
	var self = this;
	// Getting interfaces
	self.connman.systemBus.getInterface('net.connman', self.objectPath, 'net.connman.Technology', function(err, iface) {
		self.iface = iface;
        // Called when properties like Connected, Tethering, Powered change. 
        iface.on('PropertyChanged', function(name, value) {
            debug("PropertyChanged: ",name,value);
			self.emit('PropertyChanged', name, value);
		});
		if(callback) callback(null);
	});
};

Technology.prototype.getProperties = function(callback) {
	var iface = this.iface;
	if (!iface) {
		if (callback) {
			process.nextTick(function() {
				callback(new Error('No Technology device was found'));
			});
        }
		return;
	}
	iface.GetProperties.timeout = DEFAULT_TIMEOUT;
	if (callback) {
		iface.GetProperties.error = callback;
		iface.GetProperties.finish = function(props) { callback(null, props); };
	}
	iface.GetProperties();
};

Technology.prototype.setProperty = function(prop, value, callback) {
	var iface = this.iface;
	if (!iface) {
		if (callback) {
			process.nextTick(function() {
				callback(new Error('No Technology device was found'));
			});
        }
		return;
	}
	iface.SetProperty.timeout = DEFAULT_TIMEOUT;
	iface.SetProperty.error = callback || null;
	iface.SetProperty.finish = callback || null;
	iface.SetProperty(prop, value);
};

// convenience function that retrieves services of this technology's type
Technology.prototype.getServices = function(callback) {
	this.connman.getServices(this.type, callback);
};

// get first service object that matches query
Technology.prototype.searchService = function(query,callback) {
	this.connman.searchService(query, this.type, callback);
};

Technology.prototype.scan = function(callback) {
	var iface = this.iface;
	if (!iface) {
		if (callback) {
			process.nextTick(function() {
				callback(new Error('No Wifi device was found'));
			});
        }
		return;
	}
	iface.Scan.timeout = 30000;
	iface.Scan.error = callback || null;
	iface.Scan.finish = callback || null;
	iface.Scan();
};

Technology.prototype.enableTethering = function() {
	var self = this;
    var ssid = (typeof arguments[0] == 'string')? arguments[0] : null;
    var passphrase = (typeof arguments[1] == 'string')? arguments[1] : null;
    var lastArgument = arguments[arguments.length-1];
    var callback = (typeof lastArgument == 'function')? lastArgument : null;
    debug("enableTethering: ",ssid,passphrase);
	async.series([
		function(next) {
            if(ssid) self.setProperty('TetheringIdentifier', ssid, next);
            else next();
		},
		function(next) {
            if(passphrase) self.setProperty('TetheringPassphrase', passphrase, next);
            else next();
		},
        function(next) {
            self.setProperty('Tethering', true, next);
        }
	],
	function(err,res) {
        if(callback) callback(err,res[3]); 		
	});
};

Technology.prototype.disableTethering = function(callback) {
	this.setProperty('Tethering', false, function(err, res) {
		if(callback) callback(err,res);
	});
};
