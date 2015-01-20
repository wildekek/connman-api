/*
 * Javascript interface around Service API of type WiFi
 * See: https://git.kernel.org/cgit/network/connman/connman.git/tree/doc/service-api.txt
 *
 */

"use strict";

var util = require('util');
var Service = require('./service');
var async = require('async');
var debug = require('debug')('connman:wifi');

var DEFAULT_TIMEOUT = 10000;
var super_ = Service.prototype;

var Wifi = module.exports = function(connman) {
  Service.call(this, connman);
};

util.inherits(Wifi, Service);

Wifi.prototype.init = function(serviceName, callback) {
  super_.init.call(this,"WiFi",serviceName, callback);
};

Wifi.prototype.remove = function(callback) {
  var self = this;
  var svc = self.service;
  if (!self.technology) {
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
  svc.Remove.error = callback || null;
  svc.Remove.finish = callback || null;
  svc.removeAllListeners('PropertyChanged');
  svc.Remove();
};