/*
 * Javascript interface around Service API of type Bluetooth
 * See: https://git.kernel.org/cgit/network/connman/connman.git/tree/doc/service-api.txt
 *
 */

"use strict";

var util = require('util');
var Service = require('./service');
var async = require('async');
var debug = require('debug')('connman:bluetooth');

var DEFAULT_TIMEOUT = 10000;
var super_ = Service.prototype;

var Bluetooth = module.exports = function(connman) {
    Service.call(this, connman);
};

util.inherits(Bluetooth, Service);

Bluetooth.prototype.init = function(serviceName, callback) {
    super_.init("Bluetooth",serviceName, callback);
};