'use strict';

var util = require('util');
var VoicemailBase = require('./voicemailbase.js');
var Menu = require('./helpers/voicemailmenu.js');

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
      // TODO: use dtmf buffer to hold dtmf events until menu is setup then
      //       insert into menu state machine
      self.init(event, channel)
        .then(function(mailboxHelper) {

          var message = null;
          var menu = new Menu(mailboxHelper);
          var duration;

          // TODO: register command handlers
          menu.on('RecordMessage', function() {
            console.log('received RecordMessage event');
            message = mailboxHelper.messageHandler.newMessage();

            mailboxHelper.messageHandler
              .record(message)
              .done(function() {
                console.log('recording message');
              });
          });

          menu.on('RecordingFinished', function(reportedDuration) {
            console.log('received RecordingFinished event');
            // TODO: dependent on duration patch
            console.log('duration', reportedDuration);
            duration = reportedDuration;
          });

          menu.on('RecordingVerified', function() {
            console.log('received RecordingVerified event');
            // save message
            console.log('saving message');
            if (duration) {
              message.duration = duration;
            }
            mailboxHelper.messageHandler.save(message, true)
              .done(function() {
                console.log('done saving');
              });
          });
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
