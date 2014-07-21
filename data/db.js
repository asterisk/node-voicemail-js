'use strict';

var util = require('util');
var config = require('../config.json');
var providerName = config.connectionString.split(':')[0];
var Provider = require(util.format('./providers/%s/concrete.js', providerName));
var data = new Provider(config);

module.exports = data.init();
