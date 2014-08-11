'use strict';

var util = require('util');
var VoicemailBase = require('./voicemailbase.js');
var fsm = require('./helpers/fsm/vmmainfsm.js');

/**
 * Voicemail Main application constructor.
 *
 * @param {ari-client~Client} ari - ARI client
 */
function VoicemailMain(ari) {
  var self = this;

  VoicemailBase.call(self, ari, 'voicemail-main');


  // TODO: will need to keep array or object of Stasis channels
  //       to enable easy removal of listeners to ensure gc works properly

  /**
   * Voicemail Main Handler for StasisStart event.
   *
   * @param {Object} event - the event object
   * @param {ari-client~Channel} channel - the channel entering Stasis
   */
  self.start = function(event, channel) {
    // make sure this event is for our voicemail app
    if (self.isOwnStasisStart(event)) {
      console.log('handling call to voicemail-main');

      var mailboxNumber = event.args[1];

      var state = fsm.create(mailboxNumber, true);

      channel.on('ChannelDtmfReceived', function(event) {
        state.handle('dtmf', event.digit);
      });

      channel.on('ChannelHangupRequest', function(event) {
        state.stop();
      });

      var targetUri = util.format('channel:%s', channel.id);

      self.ari.on('PlaybackStarted', function(event, playback) {
        if (event.playback['target_uri'] === targetUri) {
          state.handle('playingStarted', playback);
        }
      });

      self.ari.on('PlaybackFinished', function(event, playback) {
        if (event.playback['target_uri'] === targetUri) {
          state.handle('playingFinished', playback);
        }
      });

      // TODO: answer channel, init mailboxhelper and messages

      self.init(event, channel)
        .then(function(mailboxHelper) {

          state.handle('loadMailboxHelper', mailboxHelper);

          return mailboxHelper.messageHandler.getMessages()
            .then(function(messages) {
              state.handle('loadMessages', messages);
            });
        })
        .done();
    }
  };

  this.ari.on('StasisStart', self.start);
  // TODO: add on StasisEnd to remove event listeners since client is long
  //       running
}

util.inherits(VoicemailMain, VoicemailBase);

module.exports = VoicemailMain;
