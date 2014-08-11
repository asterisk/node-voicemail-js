'use strict';

var util = require('util');
var VoicemailBase = require('./voicemailbase.js');
var fsm = require('./helpers/fsm/vmfsm.js');

/**
 * Voicemail application constructor.
 *
 * @param {ari-client~Client} ari - ARI client
 */
function Voicemail(ari) {
  var self = this;

  VoicemailBase.call(self, ari, 'voicemail');


  // TODO: will need to keep array or object of Stasis channels
  //       to enable easy removal of listeners to ensure gc works properly

  /**
   * Voicemail Handler for StasisStart event.
   *
   * @param {Object} event - the event object
   * @param {ari-client~Channel} channel - the channel entering Stasis
   */
  self.start = function(event, channel) {
    // make sure this event is for our voicemail app
    if (self.isOwnStasisStart(event)) {
      console.log('handling call to voicemail');

      var mailboxNumber = event.args[1];

      var state = fsm.create(mailboxNumber);

      channel.on('ChannelDtmfReceived', function(event) {
        state.handle('dtmf', event.digit);
      });

      channel.on('ChannelHangupRequest', function(event) {
        state.stop();
      });

      var targetUri = util.format('channel:%s', channel.id);

      self.ari.on('RecordingStarted', function(event, recording) {
        if (event.recording['target_uri'] === targetUri) {
          state.handle('recordingStarted', recording);
        }
      });

      self.ari.on('RecordingFinished', function(event, recording) {
        if (event.recording['target_uri'] === targetUri) {
          state.handle('recordingFinished', recording);
        }
      });

      self.init(event, channel)
        .then(function(mailboxHelper) {
          state.handle('loadMailboxHelper', mailboxHelper);
        })
        .done();
    }
  };

  this.ari.on('StasisStart', self.start);
  // TODO: add on StasisEnd to remove event listeners since client is long
  //       running
}

util.inherits(Voicemail, VoicemailBase);

module.exports = Voicemail;
