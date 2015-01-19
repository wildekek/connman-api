/*
 * Javascript interface around Service API
 * See: https://git.kernel.org/cgit/network/connman/connman.git/tree/doc/service-api.txt
 *
 */

"use strict";

var util = require('util');
var events = require('events');
var async = require('async');
var debug = require('debug')('connman:service');

var DEFAULT_TIMEOUT = 10000;

var Service = module.exports = function(connman) {
  Service.prototype.connman = connman;
  Service.prototype.service = null;
  Service.prototype.technology = null;
};

util.inherits(Service, events.EventEmitter);

Service.prototype.init = function(technologyType, serviceName, callback) {
  Service.prototype.technology = Service.prototype.connman.technologies[technologyType];
  Service.prototype.selectService(serviceName, function(err) {
    if (callback) callback(err);
  });
};

Service.prototype.getProperties = function(callback) {
  var svc = Service.prototype.service;
  if (!svc) {
    process.nextTick(function() {
      callback(new Error('No service was found'));
    });
    return;
  }
  svc.GetProperties.timeout = DEFAULT_TIMEOUT;
  svc.GetProperties.error = callback;
  svc.GetProperties.finish = function(props) { callback(null, props); };
  svc.GetProperties();
};

Service.prototype.setProperty = function(prop, value, callback) {
  var svc = Service.prototype.service;
  if (!svc) {
    if (callback) {
      process.nextTick(function() {
        callback(new Error('No service was found'));
      });
    }
    return;
  }
  svc.SetProperty.timeout = DEFAULT_TIMEOUT;
  svc.SetProperty.error = callback || null;
  svc.SetProperty.finish = callback || null;
  svc.SetProperty(prop, value);
};

Service.prototype.connect = function(callback) {
  var self = this;
  var svc = Service.prototype.service;
  if (!Service.prototype.technology) {
    if (callback) {
      process.nextTick(function() {
        callback(new Error('No technology was found'));
      });
    }
    return;
  }
  if (!svc) {
    if (callback) {
      process.nextTick(function() {
        callback(null);
      });
    }
    return;
  }
  // Establish connection
  self.service.Connect.timeout = 30000;
  self.service.Connect();
  // Make sure again to listen for PropertyChanged
  self.service.removeAllListeners('PropertyChanged');
  self.service.on('PropertyChanged', function(name, value) {
      self.emit('PropertyChanged', name, value);
  });
  // Return agent for this connection
  callback(null, self.connman.Agent);
};

Service.prototype.disconnect = function(callback) {
  var svc = Service.prototype.service;
  if (!Service.prototype.technology) {
    if (callback) {
      process.nextTick(function() {
        callback(new Error('No technology was found'));
      });
    }
    return;
  }
  if (!svc) {
    if (callback) {
      process.nextTick(function() {
        callback(null);
      });
    }
    return;
  }
  svc.Disconnect.error = callback || null;
  svc.Disconnect.finish = callback || null;
  //svc.removeAllListeners('PropertyChanged');
  svc.Disconnect();
};

Service.prototype.selectService = function(objectPath, callback) {
  var self = this;
  if (!Service.prototype.technology) {
    if (callback) {
      process.nextTick(function() {
        callback(new Error('No technology was found'));
      });
    }
    return;
  }
  Service.prototype.connman.systemBus.getInterface('net.connman', objectPath, 'net.connman.Service', function(err, iface) {
    if (err) {
      callback(new Error('No such service'));
      return;
    }
    // Release current service we used
    if (Service.prototype.service) {
      Service.prototype.service.removeAllListeners('PropertyChanged');
    }
    // Set new service
    Service.prototype.service = iface;
    // Initializing signal handler for this new service
    iface.on('PropertyChanged', function(name, value) {
      self.emit('PropertyChanged', name, value);
    });
    if (callback) callback(null, iface);
  });
};
