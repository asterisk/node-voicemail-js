'use strict';

var Q = require('q');
var ariClient = require('ari-client');
var config = require('../../config.json');
var connect = Q.denodeify(ariClient.connect);

/**
 * Returns promise that will contain client connected to voicemail and voicemail
 * main stasis apps.
 */
module.exports = connect(config.ariConnection.url, config.ariConnection.user,
    config.ariConnection.pass)
  .then(function(client) {
    client.start(['voicemail', 'voicemail-main']);
    return client;
  })
  .catch(function(err) {
    console.error(err);
  });
