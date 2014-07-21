'use strict';

var util = require('util');
var VoicemailBase = require('./voicemailbase.js');
var Menu = require('./helpers/voicemailmainmenu.js');

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
      // TODO: use dtmf buffer to hold dtmf events until menu is setup then
      //       insert into menu state machine
      self.init(event, channel)
        .then(function(mailboxHelper) {

          mailboxHelper.messageHandler.getMessages()
            .then(function(messages) {

              var menu = new Menu(mailboxHelper);

              // TODO: register command handlers
              menu.on('NextMessage', function() {
                console.log('received NextMessage event');
                mailboxHelper.messageHandler.getLatestMessages(messages.latest)
                  .then(function(latest) {
                    messages.add(latest);
                    var message = messages.next();
                    if (message) {
                      mailboxHelper.messageHandler.play(message).done();
                    }
                  })
                  .done();
              });

              menu.on('FirstMessage', function() {
                console.log('received FirstMessage event');
                mailboxHelper.messageHandler.getLatestMessages(messages.latest)
                  .then(function(latest) {
                    messages.add(latest);
                    var message = messages.first();
                    if (message) {
                      mailboxHelper.messageHandler.play(message).done();
                    }
                  })
                  .done();
              });

              menu.on('PreviousMessage', function() {
                console.log('received PreviousMessage event');
                var message = messages.previous();
                if (message) {
                  mailboxHelper.messageHandler.play(message).done();
                }
              });

              menu.on('ReplayMessage', function() {
                console.log('received ReplayMessage event');
                var message = messages.current();
                if (message) {
                  mailboxHelper.messageHandler.play(message).done();
                }
              });

              menu.on('DeleteMessage', function() {
                console.log('received DeleteMessage event');
                var message = messages.current();
                if (message) {
                  messages.remove(message);
                  mailboxHelper.messageHandler.delete(message).done();
                }
              });

              menu.on('MessageRead', function(recording) {
                console.log('received MessageRead event');
                // get message and if was not previously read, save it
                var message = messages.getMessage(recording);
                var changed = messages.markAsRead(message);
                if (changed) {
                  mailboxHelper.messageHandler.save(message, true).done();
                }
              });

              menu.on('ChangeFolder', function(dtmf) {
                console.log('received ChangeFolder event');
                mailboxHelper.messageHandler.changeFolder(dtmf)
                  .then(function(folderMessages) {
                    messages = folderMessages;
                  })
                  .done(function() {
                    console.log('changed to folder', dtmf);
                  });
              });

              menu.on('MoveToFolder', function(dtmf) {
                console.log('received MoveToFolder event');
                var message = messages.current();
                mailboxHelper.messageHandler.moveToFolder(message, dtmf)
                  .then(function(saved) {
                    if (saved) {
                      messages.remove(message);
                    }
                    return saved;
                  })
                  .done(function(saved) {
                    if (saved) {
                      console.log('moved message to folder', message._id, dtmf);
                    } else {
                      console.error('error saving to folder', dtmf);
                    }
                  });
              });
          })
          .done();
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
