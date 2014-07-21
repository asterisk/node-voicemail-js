'use strict';

var ari = require('./lib/helpers/ari.js');
var Voicemail = require('./lib/voicemail.js');
var VoicemailMain = require('./lib/voicemailmain.js');

// connect to ari and initialize voicemail and voicemail main
ari.then(function(client) {
  console.log('initializing voicemail and voicemail main');

  var voicemail = new Voicemail(client);
  var voicemailmain = new VoicemailMain(client);
}).done();
