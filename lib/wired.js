/*
 * Javascript interface around Service API of type WiFi
 * See: https://git.kernel.org/cgit/network/connman/connman.git/tree/doc/service-api.txt
 *
 */

"use strict";

var util = require('util');
var Service = require('./service');
var events = require('events');
var debug = require('debug')('connman:wired');

var DEFAULT_TIMEOUT = 10000;
var super_ = Service.prototype;

var Wired = module.exports = function(connman) {
	Service.call(this, connman);
};

util.inherits(Wired, Service);

Wired.prototype.init = function(serviceName, callback) {
    super_.init("Wired",serviceName, callback);
};

Wired.prototype.setConfiguration = function(config, callback) {
	var self = this;

	if (!config) {
		if (callback) {
			process.nextTick(function() {
				callback(new Error('no configuration'));
			});
        }
		return;
	}

	// Setting IPv4 configuration
	if (config.ipv4) {
		var settings = {};
		if (!config.method) {
			if (callback) {
				process.nextTick(function() {
					callback(new Error('Unknown method'));
				});
            }
			return;
		}
		switch(config.method) {
            case 'manual':
                settings.Method = config.method;
                settings.Address = config.ipaddress || '10.74.11.15';
                settings.Netmask = config.netmask || '255.0.0.0';
                break;
            case 'dhcp':
                settings.Method = config.method;
                break;
            default:
                if (callback) {
                    process.nextTick(function() {
                        callback(new Error('Unknown method'));
                    });
                }
                return;
		}
		// Apply
		self.setProperty('IPv4.Configuration', settings, function(err) {
			if (callback) callback(err);
		});
	}
};
