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
        
		callback(null);
	});
};

Technology.prototype.getProperties = function(callback) {
	var self = this;
	var iface = self.iface;

	if (!iface) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No Technology device was found'));
			});

		return;
	}

	iface.GetProperties['timeout'] = 10000;
	if (callback) {
		iface.GetProperties['error'] = callback;
		iface.GetProperties['finish'] = function(props) { callback(null, props); };
	}
	iface.GetProperties();
};

Technology.prototype.setProperty = function(prop, value, callback) {
	var self = this;
	var iface = self.iface;

	if (!iface) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No Technology device was found'));
			});

		return;
	}

	iface.SetProperty['timeout'] = 10000;
	iface.SetProperty['error'] = callback || null;
	iface.SetProperty['finish'] = callback || null;
	iface.SetProperty(prop, value);
};

// convenience function that retrieves services of this technology's type
Technology.prototype.getServices = function(callback) {
	var self = this;

	if (!callback)
		return;

	self.connman.getServices(self.type, callback);
};

Technology.prototype.scan = function(callback) {
	var self = this;
	var iface = self.iface;

	if (!iface) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No Wifi device was found'));
			});

		return;
	}

	iface.Scan['timeout'] = 30000;
	iface.Scan['error'] = callback || null;
	iface.Scan['finish'] = callback || null;
	iface.Scan();
};

Technology.prototype.enableTethering = function(ssid, passphrase, callback) {
	var self = this;
	async.series([
        function(next) {
            if (!self.iface) {
                process.nextTick(function(){
                    next(new Error('No Wifi device was found'))
                });
            } else { 
                next();
            }
        },
		function(next) {
			self.setProperty('TetheringIdentifier', ssid, next);
		},
		function(next) {
			self.setProperty('TetheringPassphrase', passphrase, next);
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
	var self = this;

	if (!self.iface) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No Wifi device was found'));
			});

		return;
	}

	self.setProperty('Tethering', false, function(err, res) {
		callback(err,res);
	});
};
